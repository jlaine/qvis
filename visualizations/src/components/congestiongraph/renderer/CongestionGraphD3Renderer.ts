import QlogConnection from '@/data/Connection';
import * as d3 from 'd3';
import * as qlog from '@quictools/qlog-schema';
import CongestionGraphConfig from '../data/CongestionGraphConfig';
import { MainGraphState } from './MainGraphState';
import { RecoveryGraphState } from './RecoveryGraphState';
import { Selection } from 'd3';

export default class CongestionGraphD3Renderer {

    public containerID:string;
    public rendering:boolean = false;

    private config!:CongestionGraphConfig;
    private mainGraphState!: MainGraphState; // Keeps track of everything contained in the main graph of the visualisation (data sent/received, congestion info)
    private recoveryGraphState!: RecoveryGraphState; // Keeps track of data needed for the recovery graph of the visualisation (RTT)

    private mainGraphContainer?: Selection<HTMLDivElement, unknown, HTMLElement, any>;
    private recoveryGraphContainer?: Selection<HTMLDivElement, unknown, HTMLElement, any>;

    // Stored for quick referencing instead of needing to use lookup every redraw
    // Given that these lists only change on load of a new log, this should not be a problem
    private packetsSent!: Array<Array<any>>;
    private packetsReceived!: Array<Array<any>>;
    private metricUpdates!: Array<Array<any>>;

    private isInitialised: boolean = false;

    // mouse coordinates of mouse move for panning
    private previousMouseX: number | null = null;
    private previousMouseY: number | null = null;

    constructor(containerID:string){
        this.containerID = containerID;
    }

    public render(config:CongestionGraphConfig) {
        if ( this.rendering ) {
            return;
        }

        console.log("CongestionGraphRenderer:render", config);

        this.config = config;

        if (!this.isInitialised) {
            // Initialise the states for both the main and recovery graph
            // This should only be done once as multiple components can be reused over multiple renders
            this.mainGraphState = new MainGraphState();
            this.recoveryGraphState = new RecoveryGraphState();
            this.init();
            this.isInitialised = true;
        } else {
            // Reset the scales, ranges, etc used by the previous render
            this.mainGraphState.reset();
            this.recoveryGraphState.reset();
        }

        this.rendering = true;

        const canContinue:boolean = this.setup();

        if ( !canContinue ) {
            this.rendering = false;

            return;
        }

        this.renderParts().then( () => {
            this.rendering = false;
        });

    }

    // Called on first render only
    // Init elements that are used across multiple renders
    private init() {
        // The eventBus can be used for firing events and listening to them
        // It is currently used for clicking events on packets
        // and transmits which packet has been clicked on
        this.mainGraphState.eventBus = document.createElement("span");

        // Is used as a tooltip when hovering over events
        this.mainGraphState.packetInformationDiv = d3.select("#packetInfo");

        // Create the containers for both the main graph and the graph displaying recovery (rtt) information
        this.mainGraphContainer = d3.select("#" + this.containerID).append("div")
            .attr("id", "mainGraphContainer")
            .style("height", this.mainGraphState.outerHeight + "px")

        this.recoveryGraphContainer = d3.select("#" + this.containerID).append("div")
            .attr("id", "recoveryGraphContainer")
            .style("height", this.recoveryGraphState.outerHeight + "px");


        // Contains the chart axii, grid, labels
        this.mainGraphState.graphSvg = this.mainGraphContainer
            .append('svg:svg')
            .attr('width', this.mainGraphState.outerWidth)
            .attr('height', this.mainGraphState.outerHeight)
            .style('position', "absolute")
            .append('g')
            .attr('transform', 'translate(' + this.mainGraphState.margins.left + ', ' + this.mainGraphState.margins.top + ')');

        // Canvas on which the plots are drawn
        this.mainGraphState.canvas = this.mainGraphContainer
            .append('canvas')
            .attr('width', this.mainGraphState.innerWidth)
            .attr('height', this.mainGraphState.innerHeight)
            .style('margin-left', this.mainGraphState.margins.left + "px")
            .style('margin-top', this.mainGraphState.margins.top + "px")
            .style('position', "absolute");

        // The next few SVGs are used for the different tools/modes
        // Based on which SVG is on top (highest z-level), a tool is selected
        // Each layer has its own event triggers (initialised later) to enable/disable certain function
        // for each mode. As an example, the panning layer has events hooked up for both panning and zooming
        // while neither zoom-brushes are able to use panning (as the main mouse button is reserved for creating the brush area).
        this.mainGraphState.mouseHandlerPanningSvg = this.mainGraphContainer
            .append('svg:svg')
            .attr('width', this.mainGraphState.innerWidth)
            .attr('height', this.mainGraphState.innerHeight)
            .style('margin-left', this.mainGraphState.margins.left + "px")
            .style('margin-top', this.mainGraphState.margins.top + "px")
            .style('z-index', 1) // Enabled by default
            .style('position', "absolute");

        this.mainGraphState.mouseHandlerBrushXSvg = this.mainGraphContainer
            .append('svg:svg')
            .attr('width', this.mainGraphState.innerWidth)
            .attr('height', this.mainGraphState.innerHeight)
            .style('margin-left', this.mainGraphState.margins.left + "px")
            .style('margin-top', this.mainGraphState.margins.top + "px")
            .style('z-index', 0) // Disabled by default
            .style('position', "absolute");

        this.mainGraphState.mouseHandlerBrush2dSvg = this.mainGraphContainer
            .append('svg:svg')
            .attr('width', this.mainGraphState.innerWidth)
            .attr('height', this.mainGraphState.innerHeight)
            .style('margin-left', this.mainGraphState.margins.left + "px")
            .style('margin-top', this.mainGraphState.margins.top + "px")
            .style('z-index', 0) // Disabled by default
            .style('position', "absolute");

        this.mainGraphState.mouseHandlerSelectionSvg = this.mainGraphContainer
            .append('svg:svg')
            .attr('width', this.mainGraphState.innerWidth)
            .attr('height', this.mainGraphState.innerHeight)
            .style('margin-left', this.mainGraphState.margins.left + "px")
            .style('margin-top', this.mainGraphState.margins.top + "px")
            .style('z-index', 0) // Disabled by default
            .style('position', "absolute");

        this.mainGraphState.mouseHandlerPickSvg = this.mainGraphContainer
            .append('svg:svg')
            .attr('width', this.mainGraphState.innerWidth)
            .attr('height', this.mainGraphState.innerHeight)
            .style('margin-left', this.mainGraphState.margins.left + "px")
            .style('margin-top', this.mainGraphState.margins.top + "px")
            .style('z-index', 0) // Disabled by default
            .style('position', "absolute");

        this.recoveryGraphState.graphSvg = this.recoveryGraphContainer
            .append('svg:svg')
            .attr('width', this.recoveryGraphState.outerWidth)
            .attr('height', this.recoveryGraphState.outerHeight)
            .style('position', "absolute")
            .append('g')
            .attr('transform', 'translate(' + this.recoveryGraphState.margins.left + ', ' + this.recoveryGraphState.margins.top + ')');

        this.recoveryGraphState.canvas = this.recoveryGraphContainer
            .append('canvas')
            .attr('width', this.recoveryGraphState.innerWidth)
            .attr('height', this.recoveryGraphState.innerHeight)
            .style('margin-left', this.recoveryGraphState.margins.left + "px")
            .style('margin-top', this.recoveryGraphState.margins.top + "px")
            .style('position', "absolute");

        // Contexts for the canvas which will be used for drawing
        this.mainGraphState.canvasContext = this.mainGraphState.canvas.node()!.getContext('2d');
        this.recoveryGraphState.canvasContext = this.recoveryGraphState.canvas.node()!.getContext('2d');

        // Graphical axii which are used for all renders
        // Can be updated by calling it using an axis object and thus reused over multiple renders
        this.mainGraphState.gxAxis = this.mainGraphState.graphSvg!.append('g')
            .attr('transform', 'translate(0, ' + this.mainGraphState.innerHeight + ')')
            .attr("class", "grid");

        this.mainGraphState.gyAxis = this.mainGraphState.graphSvg!.append('g')
            .attr("class", "grid");

        this.mainGraphState.gyCongestionAxis = this.mainGraphState.graphSvg!.append('g')
            .attr("class", "nogrid");

        this.recoveryGraphState.gxAxis = this.recoveryGraphState.graphSvg!.append('g')
            .attr('transform', 'translate(0, ' + this.recoveryGraphState.innerHeight + ')')
            .attr("class", "grid");

        this.recoveryGraphState.gyAxis = this.recoveryGraphState.graphSvg!.append('g')
            .attr("class", "grid");

        /* Axis labels */
        // Main y-axis
        this.mainGraphState.graphSvg!.append('text')
            .attr('x', '-' + (this.mainGraphState.innerHeight / 2))
            .attr('dy', '-3.5em')
            .attr('transform', 'rotate(-90)')
            .text('Data (bytes)');

        // X axis
        this.mainGraphState.graphSvg!.append('text')
            .attr('x', '' + (this.mainGraphState.innerWidth / 2))
            .attr('y', '' + (this.mainGraphState.innerHeight + 40))
            .text('Time (ms)');

        // Congestion Y axis
        this.mainGraphState.congestionAxisText = this.mainGraphState.graphSvg!.append('text')
            .attr('transform', 'translate(' + (this.mainGraphState.innerWidth + this.mainGraphState.margins.right / 2) + ', ' + this.mainGraphState.innerHeight / 2 + '), rotate(-90)')
            .text('Congestion info (bytes)');

        // Recovery x axis
        this.recoveryGraphState.graphSvg!.append('text')
            .attr('x', '' + (this.recoveryGraphState.innerWidth / 2))
            .attr('y', '' + (this.recoveryGraphState.innerHeight + 40))
            .text('Time (ms)');

        // Recovery y axis
        this.recoveryGraphState.graphSvg!.append('text')
            .attr('x', '-' + (this.recoveryGraphState.innerHeight / 2))
            .attr('dy', '-3.5em')
            .attr('transform', 'rotate(-90)')
            .text('RTT (ms)');
    }

    // runs once before each render. Used to bootstrap everything.
    protected setup():boolean {
        // Parse log file and prepare the data for drawing and interaction
        this.parseQlog();
        this.initSentSide({}); // FIXME pass settings with minX and maxX if needed
        this.initReceivedSide({}); // FIXME pass settings with minX and maxX if needed

        // Display the axii we just created in each corresponding graphical axis
        this.mainGraphState.gxAxis!.call(this.mainGraphState.currentPerspective().xAxis!);
        this.mainGraphState.gyAxis!.call(this.mainGraphState.currentPerspective().yAxis!);
        this.mainGraphState.gyCongestionAxis!.call(this.mainGraphState.sent.yCongestionAxis!);
        this.recoveryGraphState.gxAxis!.call(this.recoveryGraphState.xAxis!);
        this.recoveryGraphState.gyAxis!.call(this.recoveryGraphState.yAxis!);

        // Wrap class methods so we can pass them as event handlers
        const self = this; // Self pointer is needed as 'this' changes in callbacks

        const onZoom = () => {
            self.onZoom();
        };
        const onPan = () => {
            self.onPan();
        }
        const onHover = () => {
            self.onHover();
        }
        const onPickerClick = () => {
            self.onPickerClick();
        }
        const onBrushXEnd = () => {
            self.onBrushXEnd();
        }
        const onBrush2dEnd = () => {
            self.onBrush2dEnd();
        }

        // We have multiple layers of SVGs, each for a different mode
        // Here we hook up the allowed events to each of the different modes
        this.mainGraphState.mouseHandlerPanningSvg!.on("wheel", onZoom)
            .on("click", onPickerClick)
            .on("mousemove.pan", onPan)
            .on("mousemove.hover", onHover);

        this.mainGraphState.mouseHandlerPickSvg!.on("wheel", onZoom)
            .on("click", onPickerClick)
            .on("mousemove", onHover);

        this.mainGraphState.brushX = d3.brushX()
            .extent([[0, 0], [this.mainGraphState.innerWidth, this.mainGraphState.innerHeight]])
            .on("end", onBrushXEnd);

        this.mainGraphState.brushXElement = this.mainGraphState.mouseHandlerBrushXSvg!
            .append("g")
            .attr("class", "brush")
            .call(this.mainGraphState.brushX)
            .on("wheel", onZoom)
            .on("mousemove", onHover);

        this.mainGraphState.brush2d = d3.brush()
            .extent([[0, 0], [this.mainGraphState.innerWidth, this.mainGraphState.innerHeight]])
            .on("end", onBrush2dEnd);

        this.mainGraphState.brush2dElement = this.mainGraphState.mouseHandlerBrush2dSvg!
            .append("g")
            .attr("class", "brush")
            .call(this.mainGraphState.brush2d)
            .on("wheel", onZoom)
            .on("mousemove", onHover);

        // Commented out as the selection brush is no longer used
        // Selection brush could be used to return all packets in a selection
        // this.mainGraphState.selectionBrush = d3.brush()
        //     .extent([[0, 0], [this.mainGraphState.innerWidth, this.mainGraphState.innerHeight]])
        //     .on("end", onSelection);

        // this.mainGraphState.mouseHandlerSelectionSvg!
        //     .append("g")
        //     .attr("class", "brush")
        //     .call(this.mainGraphState.selectionBrush)
        //     .on("wheel", onZoom)
        //     .on("mousemove", onHover);

        // Set the perspective now that we are done setting up
        // This allows us to only show elements that need to be shown in the current mode (packet_sent vs packet_received as main focus)
        this.setPerspective(this.mainGraphState.useSentPerspective, false);

        // Make the graphs visible
        this.mainGraphContainer!.style("display", "block");
        this.recoveryGraphContainer!.style("display", "block");

        return true;
    }

    // Initialises data used for the "packet_sent" perspective
    private initSentSide(settings: any){
        // Save the current perspective as it will be changed during this method
        const useSentPerspective: boolean = this.mainGraphState.useSentPerspective;

        // Change to sent perspective as the extrema functions look for extrema in the current perspective
        this.mainGraphState.useSentPerspective = true;

        // Find the extrema for each axis which we can use for the domains of the scales
        const [minCongestionY, maxCongestionY, minRTT, maxRTT] = this.findMetricUpdateExtrema();
        const [localXMin, localXMax] = [settings.minX && settings.minX > 0 ? settings.minX : 0, settings.maxX && settings.maxX < this.mainGraphState.sent.originalRangeX[1] ? settings.maxX : this.mainGraphState.sent.originalRangeX[1]];
        const [localMinY, localMaxY] = this.findYExtrema(localXMin, localXMax);

        // Make the congestion graph take up only 1/3 of the vertical screen space
        const scaledMaxCongestionY = maxCongestionY * 3;

        // Create the scales with domains based on the extrema we just found
        this.mainGraphState.sent.xScale = d3.scaleLinear()
            .domain([localXMin, localXMax])
            .range([0, this.mainGraphState.innerWidth]);

        this.mainGraphState.sent.yScale = d3.scaleLinear()
            .domain([localMinY, localMaxY])
            .range([this.mainGraphState.innerHeight, 0]);

        this.mainGraphState.sent.yCongestionScale = d3.scaleLinear()
            .domain([0, scaledMaxCongestionY])
            .range([this.mainGraphState.innerHeight, 0])
            .nice();

        this.recoveryGraphState.yScale = d3.scaleLinear()
            .domain([0, maxRTT])
            .range([this.recoveryGraphState.innerHeight, 0]);

        this.mainGraphState.sent.xAxis = d3.axisBottom(this.mainGraphState.sent.xScale)
            .tickSize(-this.mainGraphState.innerHeight)
            .scale(this.mainGraphState.sent.xScale);

        // Custom labeling so that big numbers are nicely rounded using a 'k' postfix
        this.mainGraphState.sent.yAxis = d3.axisLeft(this.mainGraphState.sent.yScale)
            .tickFormat( ( val ) => {
                const nr: number = val.valueOf !== undefined ? val.valueOf() : val as number;
                if (nr > 1000 || nr < -1000) {
                    // 12000 -> 12k
                    // 12010 -> 12010
                    if ( Math.round(nr) % 1000 === 0 ){
                        const k = Math.round(nr / 1000);

                        return k + "K";
                    } else {
                        return Math.round(nr).toString();
                    }
                } else {
                    return Math.round(nr).toString();
                }
            })
            .tickSize(-this.mainGraphState.innerWidth)
            .scale(this.mainGraphState.sent.yScale)

        this.mainGraphState.sent.yCongestionAxis = d3.axisRight(this.mainGraphState.sent.yCongestionScale)
            .tickFormat( ( val ) => {
                const nr: number = val.valueOf !== undefined ? val.valueOf() : val as number;
                if (nr > 1000 || nr < -1000) {
                    // 12000 -> 12k
                    // 12010 -> 12010
                    if (Math.round(nr) % 1000 === 0 ) {
                        const k = Math.round(nr / 1000);

                        return k + "K";
                    }
                    else{
                        return Math.round(nr).toString();
                    }
                }
                else {
                    return Math.round(nr).toString();
                }
            })
            .tickSize(this.mainGraphState.innerWidth)
            .scale(this.mainGraphState.sent.yCongestionScale)

        // The recovery x axis uses the same x scale as the main graph's x axis
        // so that panning/zooming/etc also applies to the recovery graph
        this.recoveryGraphState.xAxis = d3.axisBottom(this.mainGraphState.sent.xScale)
            .tickSize(-this.recoveryGraphState.innerHeight)
            .scale(this.mainGraphState.sent.xScale);

        this.recoveryGraphState.yAxis = d3.axisLeft(this.recoveryGraphState.yScale!)
            .tickSize(-this.recoveryGraphState.innerWidth)
            .scale(this.recoveryGraphState.yScale!);

        // Set the new current domains
        this.mainGraphState.sent.rangeX = [localXMin, localXMax];
        this.mainGraphState.sent.rangeY = [localMinY, localMaxY];
        this.mainGraphState.sent.congestionRangeY = this.mainGraphState.sent.originalCongestionRangeY;
        this.recoveryGraphState.rangeY = this.recoveryGraphState.originalRangeY;

        // Change the perspective back to what it originally was
        this.mainGraphState.useSentPerspective = useSentPerspective;
    }

    // Initialises data used for the "packet_sent" perspective
    private initReceivedSide(settings: any){
        // Save the current perspective as it will be changed during this method
        const useSentPerspective: boolean = this.mainGraphState.useSentPerspective;

        // Change to sent perspective as the extrema functions look for extrema in the current perspective
        this.mainGraphState.useSentPerspective = false;

        // Find the extrema for each axis which we can use for the domains of the scales
        const [localXMin, localXMax] = [settings.minX && settings.minX > 0 ? settings.minX : 0, settings.maxX && settings.maxX < this.mainGraphState.received.originalRangeX[1] ? settings.maxX : this.mainGraphState.received.originalRangeX[1]];
        const [localMinY, localMaxY] = this.findYExtrema(localXMin, localXMax);

        // Create the scales with domains based on the extrema we just found
        this.mainGraphState.received.xScale = d3.scaleLinear()
            .domain([localXMin, localXMax])
            .range([0, this.mainGraphState.innerWidth]);

        this.mainGraphState.received.yScale = d3.scaleLinear()
            .domain([localMinY, localMaxY])
            .range([this.mainGraphState.innerHeight, 0]);

        this.mainGraphState.received.xAxis = d3.axisBottom(this.mainGraphState.received.xScale)
            .tickSize(-this.mainGraphState.innerHeight)
            .scale(this.mainGraphState.received.xScale);

        // Custom labeling so that big numbers are nicely rounded using a 'k' postfix
        this.mainGraphState.received.yAxis = d3.axisLeft(this.mainGraphState.received.yScale)
            .tickFormat( ( val ) => {
                const nr: number = val.valueOf !== undefined ? val.valueOf() : val as number;
                if (nr > 1000 || nr < -1000) {
                    // 12000 -> 12k
                    // 12010 -> 12010
                    if ( Math.round(nr) % 1000 === 0 ){
                        const k = Math.round(nr / 1000);

                        return k + "K";
                    } else {
                        return Math.round(nr).toString();
                    }
                } else {
                    return Math.round(nr).toString();
                }
            })
            .tickSize(-this.mainGraphState.innerWidth)
            .scale(this.mainGraphState.received.yScale)

        // Set the new current domains
        this.mainGraphState.received.rangeX = [localXMin, localXMax];
        this.mainGraphState.received.rangeY = [localMinY, localMaxY];

        // Change the perspective back to what it originally was
        this.mainGraphState.useSentPerspective = useSentPerspective;
    }

    // Redraw canvas using the current set boundaries (stored in rangeX and rangeY for the current perspective)
    private async renderParts(){
        this.redrawCanvas(this.mainGraphState.currentPerspective().rangeX[0], this.mainGraphState.currentPerspective().rangeX[1], this.mainGraphState.currentPerspective().rangeY[0], this.mainGraphState.currentPerspective().rangeY[1])
    }

    // Y corresponds to coordinates for data sent/received in bytes
    // Y scale for congestion info and recovery info is static and can not be changed
    private redrawCanvas(minX: number, maxX: number, minY: number, maxY: number) {
        // currentPerspective gives easy access to the variables of the current perspective
        // This way we can cover both perspectives without having to use a lot conditions
        const currentPerspective = this.mainGraphState.currentPerspective();

        // The width of a single event, before scaling applied
        const rectWidth = 3;

        // Set the domain of the scales
        currentPerspective.xScale = d3.scaleLinear()
            .domain([minX, maxX])
            .range([0, this.mainGraphState.innerWidth]);

        currentPerspective.yScale = d3.scaleLinear()
            .domain([minY, maxY])
            .range([this.mainGraphState.innerHeight, 0]);

        // And update the graphical axii to display these new scales
        this.mainGraphState.gxAxis!.call(currentPerspective.xAxis!.scale(currentPerspective.xScale));
        this.mainGraphState.gyAxis!.call(currentPerspective.yAxis!.scale(currentPerspective.yScale));

        // Clear before drawing
        this.mainGraphState.canvasContext!.clearRect(0, 0, this.mainGraphState.innerWidth, this.mainGraphState.innerHeight);

        if (this.mainGraphState.useSentPerspective) {
            // In case we're using the 'sent-perspective' we want to update the recoverygraph's graphical axis as well
            this.recoveryGraphState.gxAxis!.call(currentPerspective.xAxis!.scale(currentPerspective.xScale));
            // And clear its canvas
            this.recoveryGraphState.canvasContext!.clearRect(0, 0, this.recoveryGraphState.innerWidth, this.recoveryGraphState.innerHeight);
        }

        // The drawscales differ between x and y and are used for scaling when zooming in/out
        // The X drawscale increases asymptotically to a maximum value using a modified sigmoid function
        //     This cap ensures that events do not become overly large when zoomed in
        // The Y scaling function scales values down to, going up to 1 asymptotically
        //     This is necessary as we want Y values to be precise when zoomed in while we still want them to be visible when zoomed out
        currentPerspective.drawScaleX = this.xScalingFunction((currentPerspective.originalRangeX[1] - currentPerspective.originalRangeX[0]) / (maxX - minX));
        currentPerspective.drawScaleY = this.yScalingFunction((currentPerspective.originalRangeY[1] - currentPerspective.originalRangeY[0]) / (maxY - minY));

        // We then iterate over either the list of packets sent or received, based on the current perspective
        const packetList = this.mainGraphState.useSentPerspective ? this.packetsSent : this.packetsReceived;

        for (const packet of packetList) {
            // Draw the packets and their corresponding ack and loss events
            const parsedPacket = this.config.connection!.parseEvent(packet);
            const extraData = ((packet as any) as IEventExtension).qvis.congestion;

            const height = currentPerspective.yScale(extraData.to) - currentPerspective.yScale(extraData.from);
            const x = currentPerspective.xScale(parsedPacket.time);
            const y = currentPerspective.yScale(extraData.to);

            // Only draw within bounds
            if (x + rectWidth >= 0 && x <= this.mainGraphState.innerWidth && y + height >= 0 && y <= this.mainGraphState.innerHeight) {
                this.drawRect(this.mainGraphState.canvasContext!, x, y, rectWidth, height, "#0000FF");
            }

            // Draw the packet's ACK, if it has one
            if (extraData.correspondingAck) {
                const parsedAck = this.config.connection!.parseEvent(extraData.correspondingAck);

                const ackX = currentPerspective.xScale(parsedAck.time);

                // Only draw within bounds
                if (ackX + rectWidth >= 0 && x <= this.mainGraphState.innerWidth && y + height >= 0 && y <= this.mainGraphState.innerHeight) {
                    this.drawRect(this.mainGraphState.canvasContext!, ackX, y, rectWidth, height, "#6B8E23");
                }
            }

            // And its loss event, if it has one
            if (extraData.correspondingLoss) {
                const parsedLoss = this.config.connection!.parseEvent(extraData.correspondingLoss);

                const lossX = currentPerspective.xScale(parsedLoss.time);

                // Only draw within bounds
                if (lossX + rectWidth >= 0 && x <= this.mainGraphState.innerWidth && y + height >= 0 && y <= this.mainGraphState.innerHeight) {
                    this.drawRect(this.mainGraphState.canvasContext!, lossX, y, rectWidth, height, "#FF0000");
                }
            }
        }

        // When using the sent perspective we also want to draw congestion and RTT info
        // These are visualised using lines instead of rects/points
        if (this.mainGraphState.useSentPerspective) {
            // Congestion
            if (this.mainGraphState.congestionGraphEnabled) {
                this.drawLines(this.mainGraphState.canvasContext!, this.mainGraphState.metricUpdateLines["bytes"].map((point) => {
                    return [ this.mainGraphState.sent.xScale!(point[0]), this.mainGraphState.sent.yCongestionScale!(point[1]) ];
                }), "#808000", this.drawCircle);

                this.drawLines(this.mainGraphState.canvasContext!, this.mainGraphState.metricUpdateLines["cwnd"].map((point) => {
                    return [ this.mainGraphState.sent.xScale!(point[0]), this.mainGraphState.sent.yCongestionScale!(point[1]) ];
                }), "#8A2BE2", this.drawCross);
            }

            // RTT
            this.drawLines(this.recoveryGraphState.canvasContext!, this.mainGraphState.metricUpdateLines["minRTT"].map((point) => {
                return [ this.mainGraphState.sent.xScale!(point[0]), this.recoveryGraphState.yScale!(point[1]) ];
            }), "#C96480", undefined);

            this.drawLines(this.recoveryGraphState.canvasContext!, this.mainGraphState.metricUpdateLines["smoothedRTT"].map((point) => {
                return [ this.mainGraphState.sent.xScale!(point[0]), this.recoveryGraphState.yScale!(point[1]) ];
            }), "#8a554a", undefined);

            this.drawLines(this.recoveryGraphState.canvasContext!, this.mainGraphState.metricUpdateLines["lastRTT"].map((point) => {
                return [ this.mainGraphState.sent.xScale!(point[0]), this.recoveryGraphState.yScale!(point[1]) ];
            }), "#ff9900", undefined);
        }

        // Update the ranges to their new values
        currentPerspective.rangeX = [minX, maxX];
        currentPerspective.rangeY = [minY, maxY];
    }

    private drawRect(canvasContext: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string){
        canvasContext.beginPath();
        canvasContext.fillStyle = color;
        canvasContext.rect(x, y, width * this.mainGraphState.currentPerspective().drawScaleX, -height * this.mainGraphState.currentPerspective().drawScaleY);
        canvasContext.fill();
    }

    private drawLines(canvasContext: CanvasRenderingContext2D, pointList: Array<[number, number]>, color: string, tickDrawFunction: ((canvasContext: CanvasRenderingContext2D, x: number, y: number, color: string) => void) | undefined) {
        canvasContext.lineWidth = 1 * this.mainGraphState.currentPerspective().drawScaleX;
        if (pointList.length > 0) {
            canvasContext.beginPath();
            canvasContext.strokeStyle = color;
            const startX = pointList[0][0];
            const startY = pointList[0][1];
            canvasContext.moveTo(startX, startY);
            for (let i = 1; i < pointList.length; ++i) {
                const pointX = pointList[i][0];
                const pointY = pointList[i][1];
                canvasContext.lineTo(pointX, pointY);
            }
            canvasContext.stroke();
            for (let i = 1; i < pointList.length; ++i) {
                const pointX = pointList[i][0];
                const pointY = pointList[i][1];
                if (tickDrawFunction) {
                    tickDrawFunction(canvasContext, pointX, pointY, color);
                }
            }
        }
    }

    private drawCross(canvasContext: CanvasRenderingContext2D, centerX: number, centerY: number, color: string){
        const radius = 2;
        canvasContext.strokeStyle = color;
        // Top left to bottom right
        canvasContext.beginPath();
        canvasContext.moveTo(centerX - radius, centerY - radius);
        canvasContext.lineTo(centerX + radius, centerY + radius);
        canvasContext.stroke();

        // Top right to bottom left
        canvasContext.beginPath();
        canvasContext.moveTo(centerX + radius, centerY - radius);
        canvasContext.lineTo(centerX - radius, centerY + radius);
        canvasContext.stroke();
    }

    private drawCircle(canvasContext: CanvasRenderingContext2D, centerX: number, centerY: number, color: string){
        const radius = 2;
        canvasContext.fillStyle = color;

        canvasContext.beginPath();
        canvasContext.arc(centerX, centerY, radius, 0, 360);
        canvasContext.fill();
    }

    // Changes the perspective by either hiding/showing certain elements exclusive to the sent perspective
    private setPerspective(useSentPerspective: boolean, redraw: boolean){
        this.mainGraphState.useSentPerspective = useSentPerspective;

        if (!this.mainGraphState.useSentPerspective) {
            this.mainGraphState.congestionAxisText!.style("display", "none");
            this.mainGraphState.gyCongestionAxis!.style("display", "none");
            this.recoveryGraphState.graphSvg!.style("display", "none");
            this.recoveryGraphState.canvas!.style("display", "none");
        } else {
            this.mainGraphState.congestionAxisText!.style("display", "block");
            this.mainGraphState.gyCongestionAxis!.style("display", "block");
            this.recoveryGraphState.graphSvg!.style("display", "block");
            this.recoveryGraphState.canvas!.style("display", "block");
        }

        if (redraw) {
            this.redrawCanvas(this.mainGraphState.currentPerspective().rangeX[0], this.mainGraphState.currentPerspective().rangeX[1], this.mainGraphState.currentPerspective().rangeY[0], this.mainGraphState.currentPerspective().rangeY[1])
        }
    }

    // Parses the log file and modifies packets so that there are easy links from each packet to their corresponding acks and/or losses
    private parseQlog() {
        // Keep track of extrema as we'll be going over all packets anyway
        const sent = {
            xMin: Infinity,
            xMax: 0,
            yMin: Infinity,
            yMax: 0,
            minCongestionY: Infinity,
            maxCongestionY: 0,
            minRTT: Infinity,
            maxRTT: 0,
        }
        const received = {
            xMin: Infinity,
            xMax: 0,
            yMin: Infinity,
            yMax: 0,
        }

        // Init the lookup table as we'll be retrieving our lists of packets from there
        this.config.connection!.setupLookupTable();

        const packetsSent = this.config.connection!.lookup(qlog.EventCategory.transport, qlog.TransportEventType.packet_sent);
        const packetsReceived = this.config.connection!.lookup(qlog.EventCategory.transport, qlog.TransportEventType.packet_received);
        const packetsLost = this.config.connection!.lookup(qlog.EventCategory.recovery, qlog.RecoveryEventType.packet_lost);
        const metricUpdates = this.config.connection!.lookup(qlog.EventCategory.recovery, qlog.RecoveryEventType.metric_update);

        const packetSentList = [];
        const packetReceivedList = [];

        let totalSentByteCount = 0;
        let totalReceivedByteCount = 0;

        let DEBUG_packetsWithInvalidSize = 0;
        for (const packet of packetsSent) {
            const parsedPacket = this.config.connection!.parseEvent(packet)
            const data = parsedPacket.data;

            // Create a private namespace where we can plug in additional data -> corresponding acks, losses and from-to range
            this.createPrivateNamespace(packet);
            const extraData = ((packet as any) as IEventExtension).qvis.congestion;

            if (!data.header.packet_size || data.header.packet_size === 0) {
                ++DEBUG_packetsWithInvalidSize;
                continue;
            }

            const packetOffsetStart = totalSentByteCount + 1;
            totalSentByteCount += data.header.packet_size;

            extraData.from = packetOffsetStart;
            extraData.to = totalSentByteCount;

            // Store temporarily so we can link the ACK to this packet later in packet.qviscongestion.correspondingAck
            packetSentList[ parseInt( data.header.packet_number, 10 ) ] = packet;

            // Update extrema
            sent.xMin = sent.xMin > parsedPacket.time ? parsedPacket.time : sent.xMin;
            sent.xMax = sent.xMax < parsedPacket.time ? parsedPacket.time : sent.xMax;
            sent.yMin = sent.yMin > packetOffsetStart ? packetOffsetStart : sent.yMin;
            sent.yMax = sent.yMax < totalSentByteCount ? totalSentByteCount : sent.yMax;
        }

        if ( DEBUG_packetsWithInvalidSize > 0 ){
            console.error("CongestionGraphD3Renderer:parseQlog : There were " + DEBUG_packetsWithInvalidSize + " sent packets with invalid size! They were not used!");
        }

        DEBUG_packetsWithInvalidSize = 0;
        for (const packet of packetsReceived) {
            const parsedPacket = this.config.connection!.parseEvent(packet)
            const data = parsedPacket.data;

            // Create a private namespace where we can plug in additional data -> corresponding acks, losses and from-to range
            this.createPrivateNamespace(packet);
            const extraData = ((packet as any) as IEventExtension).qvis.congestion;

            if (data.header.packet_size && data.header.packet_size !== 0) {
                const packetOffsetStart = totalReceivedByteCount + 1;
                totalReceivedByteCount += data.header.packet_size;

                extraData.from = packetOffsetStart;
                extraData.to = totalReceivedByteCount;

                packetReceivedList[ parseInt( data.header.packet_number, 10 ) ] = packet; // Store temporarily so we can link the ACK to this packet later in packet.qviscongestion.correspondingAck

                // Update extrema
                received.xMin = received.xMin > parsedPacket.time ? parsedPacket.time : received.xMin;
                received.xMax = received.xMax < parsedPacket.time ? parsedPacket.time : received.xMax;
                received.yMin = received.yMin > packetOffsetStart ? packetOffsetStart : received.yMin;
                received.yMax = received.yMax < totalReceivedByteCount ? totalReceivedByteCount : received.yMax;
            } else {
                ++DEBUG_packetsWithInvalidSize;
            }

            // List of received packets also contains all ACKs this endpoint has received
            // so let's iterate over the ACKs and link them to their respective packets

            // Make sure the packet contains frames
            if (!data.frames) {
                continue;
            }

            const ackFrames = [];
            for (const frame of data.frames) {
                if (frame.frame_type === qlog.QUICFrameTypeName.ack) {
                    ackFrames.push(frame);
                }
            }

            if (ackFrames.length === 0) {
                continue;
            }

            // now we have the ACK frames. These are composed of ACK blocks, each ACKing a range of packet numbers
            // we go over them all, look them up individually, and add them to packetAckedList
            for (const frame of ackFrames) {
                for (const range of frame.acked_ranges) {
                    const from = parseInt(range[0], 10);
                    const to = parseInt(range[1], 10); // up to and including

                    // ackedNr will be the ACKed packet number of one of our SENT packets here
                    for (let ackedNr = from; ackedNr <= to; ++ackedNr) {
                        // find the originally sent packet
                        const sentPacket = packetSentList[ ackedNr ];
                        if (!sentPacket){
                            console.error("Packet was ACKed that we didn't send... ignoring", ackedNr, frame, packet);
                            continue;
                        }

                        // packets can be acked multiple times across received ACKs (duplicate ACKs).
                        // This is quite normal in QUIC.
                        // We only want to show the FIRST time a packet was acked, so if the acked number already exists
                        // we do not overwrite it with a later timestamp
                        // TODO: MAYBE it's interesting to show duplicate acks as well, since this gives an indication of how long it took the peer to catch up
                        // e.g., if we have a long vertical line of acks, it means the peer might be sending too large ACK packets
                        if ( !((sentPacket as any) as IEventExtension).qvis.congestion.correspondingAck ) {
                            // Store references to the corresponding ack but also store the sending packet in the ACK packet so that it can be retrieved both ways
                            ((sentPacket as any) as IEventExtension).qvis.congestion.correspondingAck = packet;
                            extraData.correspondingPackets.push(sentPacket); // Array of corresponding packets as ACKs can refer to multiple packets
                        }
                    }
                }
            }
        }

        if ( DEBUG_packetsWithInvalidSize > 0 ){
            console.error("CongestionGraphD3Renderer:parseQlog : There were " + DEBUG_packetsWithInvalidSize + " received packets with invalid size! They were not used!");
        }

        // Loop over sent packets once more now that we have a list in which we can look up received packets
        for ( const packet of packetsSent ) {
            const parsedPacket = this.config.connection!.parseEvent(packet);
            const data = parsedPacket.data;
            const extraData = ((packet as any) as IEventExtension).qvis.congestion; // Already has private namespace made in previous loop over packetsSent

            // List of sent packets also contains all ACKs this endpoint has sent
            // so let's iterate over the ACKs and link them to their respective packets

            // Make sure the packet contains frames
            if (!data.frames) {
                continue;
            }

            const ackFrames = [];
            for (const frame of data.frames) {
                if (frame.frame_type === qlog.QUICFrameTypeName.ack) {
                    ackFrames.push(frame);
                }
            }

            if (ackFrames.length === 0) {
                continue;
            }

            // now we have the ACK frames. These are composed of ACK blocks, each ACKing a range of packet numbers
            // we go over them all, look them up individually, and add them to packetAckedList
            for (const frame of ackFrames) {
                for (const range of frame.acked_ranges) {
                    const from = parseInt(range[0], 10);
                    const to = parseInt(range[1], 10); // up to and including

                    // ackedNr will be the ACKed packet number of one of our RECEIVED packets here
                    for (let ackedNr = from; ackedNr <= to; ++ackedNr) {
                        // find the originally received packet
                        const receivedPacket = packetReceivedList[ ackedNr ];
                        if (!receivedPacket) {
                            console.error("Packet was ACKed that we didn't receive... ignoring", ackedNr, frame, packet);
                            continue;
                        }

                        // packets can be acked multiple times across received ACKs (duplicate ACKs).
                        // This is quite normal in QUIC.
                        // We only want to show the FIRST time a packet was acked, so if the acked number already exists
                        // we do not overwrite it with a later timestamp
                        // TODO: MAYBE it's interesting to show duplicate acks as well, since this gives an indication of how long it took the peer to catch up
                        // e.g., if we have a long vertical line of acks, it means the peer might be sending too large ACK packets
                        if ( !((receivedPacket as any) as IEventExtension).qvis.congestion.correspondingAck ) {
                            // Store references to the corresponding ack but also store the receiving packet in the ACK packet so that it can be retrieved both ways
                            ((receivedPacket as any) as IEventExtension).qvis.congestion.correspondingAck = packet;
                            extraData.correspondingPackets.push(receivedPacket);
                        }
                    }
                }
            }
        }

        for (const packet of packetsLost) {
            const parsedPacket = this.config.connection!.parseEvent(packet);
            const data = parsedPacket.data;
            this.createPrivateNamespace(packet);

            if (!data.packet_number) {
                console.error("Packet was LOST that didn't contain a packet_number field...", packet);
                continue;
            }

            const lostPacketNumber = parseInt( data.packet_number, 10 );
            const sentPacket = packetSentList[ lostPacketNumber ];
            if (!sentPacket) {
                console.error("Packet was LOST that we didn't send... ignoring", lostPacketNumber, packet);
                continue;
            }

            // Store references to the corresponding loss but also store the sending packet in the loss packet so that it can be retrieved both ways
            ((sentPacket as any) as IEventExtension).qvis.congestion.correspondingLoss = packet;
            ((packet as any) as IEventExtension).qvis.congestion.correspondingPackets.push(sentPacket);
        }

        // Iterate over the metric updates in order to sort each type into their respective lists
        for (const update of metricUpdates) {
            const parsedUpdate = this.config.connection!.parseEvent(update);
            const data = parsedUpdate.data;

            if (data.bytes_in_flight) {
                const y = data.bytes_in_flight;
                sent.minCongestionY = sent.minCongestionY > y ? y : sent.minCongestionY;
                sent.maxCongestionY = sent.maxCongestionY < y ? y : sent.maxCongestionY;
                this.mainGraphState.metricUpdateLines.bytes.push([parsedUpdate.time, y]);
            }
            if (data.cwnd) {
                const y = data.cwnd;
                sent.minCongestionY = sent.minCongestionY > y ? y : sent.minCongestionY;
                sent.maxCongestionY = sent.maxCongestionY < y ? y : sent.maxCongestionY;
                this.mainGraphState.metricUpdateLines.cwnd.push([parsedUpdate.time, y]);
            }
            if (data.min_rtt) {
                // Time can be in microseconds so make sure to convert it to ms
                const y = parsedUpdate.timeToMilliseconds(data.min_rtt);
                sent.minRTT = sent.minRTT > y ? y : sent.minRTT;
                sent.maxRTT = sent.maxRTT < y ? y : sent.maxRTT;
                this.mainGraphState.metricUpdateLines.minRTT.push([parsedUpdate.time, y]);
            }
            if (data.smoothed_rtt) {
                // Time can be in microseconds so make sure to convert it to ms
                const y = parsedUpdate.timeToMilliseconds(data.smoothed_rtt);
                sent.minRTT = sent.minRTT > y ? y : sent.minRTT;
                sent.maxRTT = sent.maxRTT < y ? y : sent.maxRTT;
                this.mainGraphState.metricUpdateLines.smoothedRTT.push([parsedUpdate.time, y]);
            }
            if (data.latest_rtt) {
                // Time can be in microseconds so make sure to convert it to ms
                const y = parsedUpdate.timeToMilliseconds(data.latest_rtt);
                sent.minRTT = sent.minRTT > y ? y : sent.minRTT;
                sent.maxRTT = sent.maxRTT < y ? y : sent.maxRTT;
                this.mainGraphState.metricUpdateLines.lastRTT.push([parsedUpdate.time, y]);
            }
        }

        // Store these for easy access later so we don't have to do a lookup every redraw
        // Given that they will only change when loading in a new log we do not have to worry about that
        this.packetsSent = packetsSent;
        this.packetsReceived = packetsReceived;
        this.metricUpdates = metricUpdates;

        // Set the max ranges for each axis
        this.mainGraphState.sent.originalRangeX = [0, sent.xMax];
        this.mainGraphState.sent.originalRangeY = [0, sent.yMax];
        this.mainGraphState.sent.originalCongestionRangeY = [0, sent.maxCongestionY];
        this.recoveryGraphState.originalRangeY = [0, sent.maxRTT];

        this.mainGraphState.received.originalRangeX = [0, received.xMax];
        this.mainGraphState.received.originalRangeY = [0, received.yMax];

        // Store the lines so they can easily be drawn later
        this.mainGraphState.metricUpdateLines.bytes = this.fixMetricUpdates(this.mainGraphState.metricUpdateLines.bytes);
        this.mainGraphState.metricUpdateLines.cwnd = this.fixMetricUpdates(this.mainGraphState.metricUpdateLines.cwnd);
        this.mainGraphState.metricUpdateLines.minRTT = this.fixMetricUpdates(this.mainGraphState.metricUpdateLines.minRTT);
        this.mainGraphState.metricUpdateLines.smoothedRTT = this.fixMetricUpdates(this.mainGraphState.metricUpdateLines.smoothedRTT);
        this.mainGraphState.metricUpdateLines.lastRTT = this.fixMetricUpdates(this.mainGraphState.metricUpdateLines.lastRTT);
    }

    /* Zooming is based on x position of the cursor
    * Both the left and right side of the cursor should be scaled equally
    * so that the x value under the cursor stays unchanged
    *
    * If 2/3 of the graph is to the left of the cursor's x value before zooming,
    * then 2/3 of the graph should still be to the left of that x value
    * | 1 2 3 4 * 1 2 | -> | 3 4 * 1 |
    *
    */
    private onZoom() {
        // Prevent page from scrolling
        d3.event.preventDefault();

        // Clear all ackarrows
        this.mainGraphState.graphSvg!.selectAll(".ackArrow").remove();

        // Clear packet info
        this.clearPacketInfoWidget();

        // Zoomfactor is inverted based on direction scrolled
        const zoomFactor = d3.event.deltaY > 0 ? 1 / 1.5 : 1.5;

        const mouseX = this.mainGraphState.currentPerspective().xScale!.invert(d3.mouse(d3.event.currentTarget)[0]);
        const leftX = this.mainGraphState.currentPerspective().rangeX[0];
        const rightX = this.mainGraphState.currentPerspective().rangeX[1];

        const zoomedLeftPortion = ((mouseX - leftX) / zoomFactor);
        const zoomedRightPortion = ((rightX - mouseX) / zoomFactor);

        // Cap at full fit
        const newLeftX = mouseX - zoomedLeftPortion >= 0 ? mouseX - zoomedLeftPortion : 0;
        const newRightX = mouseX + zoomedRightPortion <= this.mainGraphState.currentPerspective().originalRangeX[1] ? mouseX + zoomedRightPortion : this.mainGraphState.currentPerspective().originalRangeX[1];

        const [newTopY, newBottomY] = this.findYExtrema(newLeftX, newRightX);

        // Repaint using new domains
        this.redrawCanvas(newLeftX, newRightX, newTopY, newBottomY);
    }

    private onPan() {
        if (d3.event.buttons & 1) { // Primary button pressed and moving
            // Transform mouse coordinates to graph coordinates
            const graphX = this.mainGraphState.currentPerspective().xScale!.invert(d3.mouse(d3.event.currentTarget)[0]);
            const graphY = this.mainGraphState.currentPerspective().yScale!.invert(d3.mouse(d3.event.currentTarget)[1]);

            // If not yet set, set them for next event
            if (this.previousMouseX === null || this.previousMouseY === null) {
                this.previousMouseX = graphX;
                this.previousMouseY = graphY;
                return;
            }

            const panAmountX = (this.mainGraphState.currentPerspective().rangeX[1] - this.mainGraphState.currentPerspective().rangeX[0]) / this.mainGraphState.innerWidth;
            const panAmountY = (this.mainGraphState.currentPerspective().rangeY[1] - this.mainGraphState.currentPerspective().rangeY[0]) / this.mainGraphState.innerHeight;

            let deltaX = d3.event.movementX * panAmountX * -1;// graphX - previousX;
            let deltaY = d3.event.movementY * panAmountY;// graphY - previousY;

            this.panCanvas(deltaX, deltaY);

            this.previousMouseX = graphX;
            this.previousMouseX = graphY;
        }
    }

    private clearPacketInfoWidget() {
        // Clear the packet information and hide it
        this.mainGraphState.packetInformationDiv!.style("display", "none");
        this.mainGraphState.packetInformationDiv!.select("#timestamp").text("");
        this.mainGraphState.packetInformationDiv!.select("#packetNr").text("");
        this.mainGraphState.packetInformationDiv!.select("#packetSize").text("");
        this.mainGraphState.packetInformationDiv!.select("#ackedFrom").text("");
        this.mainGraphState.packetInformationDiv!.select("#ackedTo").text("");
    }

    // Hovering over a packet gives a tooltip displaying information about the packet
    // Hovering over an ACK packet also draws an indicator towards the corresponding packets it has ACKed
    // Picking is done based on y coordinate of the cursor and the color of the pixel the mouse hovers over
    private onHover() {
        // Remove any dangling ACK arrows
        this.mainGraphState.graphSvg!.selectAll(".ackArrow").remove();
        this.clearPacketInfoWidget();

        if (d3.event.buttons !== 0) {
            return;
        }

        const svgHoverCoords = d3.mouse(d3.event.currentTarget);
        const graphCoords = [this.mainGraphState.currentPerspective().xScale!.invert(svgHoverCoords[0]), this.mainGraphState.currentPerspective().yScale!.invert(svgHoverCoords[1])];

        const pixelData = this.mainGraphState.canvasContext!.getImageData(svgHoverCoords[0], svgHoverCoords[1], 1, 1).data;
        const pixelColor = [ pixelData[0], pixelData[1], pixelData[2] ];

        // No event found
        if (pixelColor[0] === 0 && pixelColor[1] === 0 && pixelColor[2] === 0) {
            return;
        }

        // Loop over the relevant list of packets and search for a packet with a matching y value
        const packetList = this.mainGraphState.useSentPerspective ? this.packetsSent : this.packetsReceived;

        for (const packet of packetList) {
            const parsedPacket = this.config.connection!.parseEvent(packet); // parsedPacket will change if parseEvent is called again, only saves last parsedEvent so make sure to save vars we need
            const parsedPacketTime = parsedPacket.time;
            const parsedPacketData = parsedPacket.data;
            const extraDetails = ((packet as any) as IEventExtension).qvis.congestion;

            // Match found based on y value
            //  -> Given that packet x values are in increasing order and a "regular" packet comes before its ack or loss,
            //      we first match with the "regular" packet which has the same y value as its loss and ack packets
            //  -> Using this packet we can find the corresponding loss or ack if needed, as these are stored in
            //      packet.qvis.congestion.correspondingAck and packet.qvis.congestion.correspondingLoss
            //  -> We determine which packet we want based on the colour the mouse is hovering over
            if (extraDetails.from <= graphCoords[1] && extraDetails.to >= graphCoords[1]) {
                if (pixelColor[0] === 0 && pixelColor[1] === 0 && pixelColor[2] === 255 ) {
                    // Packet was of type 'packet_sent/packet_received' => display contents of current packet
                    this.mainGraphState.packetInformationDiv!.style("display", "block");
                    this.mainGraphState.packetInformationDiv!.style("margin-left", (svgHoverCoords[0] + this.mainGraphState.margins.left + 10) + "px");
                    this.mainGraphState.packetInformationDiv!.style("margin-top", (svgHoverCoords[1] + this.mainGraphState.margins.top + 10) + "px");
                    this.mainGraphState.packetInformationDiv!.select("#timestamp").text("Timestamp: " + parsedPacketTime);
                    this.mainGraphState.packetInformationDiv!.select("#packetNr").text("PacketNr: " + parsedPacketData.header.packet_number);
                    this.mainGraphState.packetInformationDiv!.select("#packetSize").text("PacketSize: " + parsedPacketData.header.packet_size);
                    return;
                } else if (pixelColor[0] === 107 && pixelColor[1] === 142 && pixelColor[2] === 35 ) {
                    // Packet was of type 'ack' => extract the ack packet from the 'packet_sent/packet_received'-packet (stored in var packet/parsedPacket)
                    const ackPacket = extraDetails.correspondingAck!;
                    const parsedAckPacket = this.config.connection!.parseEvent(ackPacket);

                    this.mainGraphState.packetInformationDiv!.style("display", "block");
                    this.mainGraphState.packetInformationDiv!.style("margin-left", (svgHoverCoords[0] + this.mainGraphState.margins.left + 10) + "px");
                    this.mainGraphState.packetInformationDiv!.style("margin-top", (svgHoverCoords[1] + this.mainGraphState.margins.top + 10) + "px");
                    this.mainGraphState.packetInformationDiv!.select("#timestamp").text("Timestamp: " + parsedAckPacket.time);
                    this.mainGraphState.packetInformationDiv!.select("#ackedFrom").text("Acked from: " + extraDetails.from);
                    this.mainGraphState.packetInformationDiv!.select("#ackedTo").text("Acked to: " + extraDetails.to);

                    let leftX = this.mainGraphState.currentPerspective().xScale!(parsedPacketTime);
                    leftX = leftX > 0 ? leftX : 0;

                    const topY = this.mainGraphState.currentPerspective().yScale!(extraDetails.from);
                    const bottomY = this.mainGraphState.currentPerspective().yScale!(extraDetails.to);
                    const height = (topY - bottomY) * this.mainGraphState.currentPerspective().drawScaleY;
                    const width = this.mainGraphState.currentPerspective().xScale!(parsedAckPacket.time) - this.mainGraphState.currentPerspective().xScale!(parsedPacketTime);

                    this.mainGraphState.graphSvg!
                        .append("rect")
                        .attr("class", "ackArrow")
                        .attr("x", leftX)
                        .attr("width", width)
                        .attr("y", bottomY)
                        .attr("height", height)
                        .attr("fill", "#fff")
                        .attr("stroke-width", "2px")
                        .attr("stroke", "#686868");

                    return;
                } else if (pixelColor[0] === 255 && pixelColor[1] === 0 && pixelColor[2] === 0 ) {
                        // Packet was of type 'lost' => extract the lost packet from the 'packet_sent/packet_received'-packet (stored in var packet/parsedPacket)
                        const lostPacked = extraDetails.correspondingLoss!;
                        const parsedLostPacket = this.config.connection!.parseEvent(lostPacked);

                        this.mainGraphState.packetInformationDiv!.style("display", "block");
                        this.mainGraphState.packetInformationDiv!.style("margin-left", (svgHoverCoords[0] + this.mainGraphState.margins.left + 10) + "px");
                        this.mainGraphState.packetInformationDiv!.style("margin-top", (svgHoverCoords[1] + this.mainGraphState.margins.top + 10) + "px");
                        this.mainGraphState.packetInformationDiv!.select("#timestamp").text("Timestamp: " + parsedLostPacket.time);
                        this.mainGraphState.packetInformationDiv!.select("#timestamp").text("Timestamp: " + parsedLostPacket.time);
                        this.mainGraphState.packetInformationDiv!.select("#packetNr").text("PacketNr: " + parsedLostPacket.data.header.packet_number);
                        this.mainGraphState.packetInformationDiv!.select("#packetSize").text("PacketSize: " + parsedLostPacket.data.header.packet_size);
                        return;
                }
            }
        }
    }

    private panCanvas(deltaX: number, deltaY: number){
        // Check if pan stays within boundaries
        // If not, set the delta to snap to boundary instead of passing it
        if (this.mainGraphState.currentPerspective().rangeX[0] + deltaX < 0) {
            deltaX = 0 - this.mainGraphState.currentPerspective().rangeX[0];
        } else if (this.mainGraphState.currentPerspective().rangeX[1] + deltaX > this.mainGraphState.currentPerspective().originalRangeX[1]) {
            deltaX = this.mainGraphState.currentPerspective().originalRangeX[1] - this.mainGraphState.currentPerspective().rangeX[1];
        }
        if (this.mainGraphState.currentPerspective().rangeY[0] + deltaY < 0) {
            deltaY = 0 - this.mainGraphState.currentPerspective().rangeY[0];
        } else if (this.mainGraphState.currentPerspective().rangeY[1] + deltaY > this.mainGraphState.currentPerspective().originalRangeY[1]) {
            deltaY = this.mainGraphState.currentPerspective().originalRangeY[1] - this.mainGraphState.currentPerspective().rangeY[1];
        }

        const newLeftX =  this.mainGraphState.currentPerspective().rangeX[0] + deltaX;
        const newRightX = this.mainGraphState.currentPerspective().rangeX[1] + deltaX;

        const newTopY = this.mainGraphState.currentPerspective().rangeY[0] + deltaY;
        const newBottomY =  this.mainGraphState.currentPerspective().rangeY[1] + deltaY;

        this.redrawCanvas(newLeftX, newRightX, newTopY, newBottomY);
    }

    public useBrushX(){
        this.mainGraphState.mouseHandlerBrush2dSvg!.style('z-index', 0);
        this.mainGraphState.mouseHandlerBrushXSvg!.style('z-index', 1);
        this.mainGraphState.mouseHandlerPanningSvg!.style('z-index', 0);
        this.mainGraphState.mouseHandlerSelectionSvg!.style('z-index', 0);
        this.mainGraphState.mouseHandlerPickSvg!.style('z-index', 0);
    }

    public useBrush2d(){
        this.mainGraphState.mouseHandlerBrush2dSvg!.style('z-index', 1);
        this.mainGraphState.mouseHandlerBrushXSvg!.style('z-index', 0);
        this.mainGraphState.mouseHandlerPanningSvg!.style('z-index', 0);
        this.mainGraphState.mouseHandlerSelectionSvg!.style('z-index', 0);
        this.mainGraphState.mouseHandlerPickSvg!.style('z-index', 0);
    }

    public usePanning(){
        this.mainGraphState.mouseHandlerBrush2dSvg!.style('z-index', 0);
        this.mainGraphState.mouseHandlerBrushXSvg!.style('z-index', 0);
        this.mainGraphState.mouseHandlerPanningSvg!.style('z-index', 1);
        this.mainGraphState.mouseHandlerSelectionSvg!.style('z-index', 0);
        this.mainGraphState.mouseHandlerPickSvg!.style('z-index', 0);
    }

    public useSelection(){
        this.mainGraphState.mouseHandlerBrush2dSvg!.style('z-index', 0);
        this.mainGraphState.mouseHandlerBrushXSvg!.style('z-index', 0);
        this.mainGraphState.mouseHandlerPanningSvg!.style('z-index', 0);
        this.mainGraphState.mouseHandlerSelectionSvg!.style('z-index', 1);
        this.mainGraphState.mouseHandlerPickSvg!.style('z-index', 0);
    }

    public usePicker(){
        this.mainGraphState.mouseHandlerBrush2dSvg!.style('z-index', 0);
        this.mainGraphState.mouseHandlerBrushXSvg!.style('z-index', 0);
        this.mainGraphState.mouseHandlerPanningSvg!.style('z-index', 0);
        this.mainGraphState.mouseHandlerSelectionSvg!.style('z-index', 0);
        this.mainGraphState.mouseHandlerPickSvg!.style('z-index', 1);
    }

    public toggleCongestionGraph(){
        this.mainGraphState.congestionGraphEnabled = this.mainGraphState.congestionGraphEnabled ? false : true;

        this.redrawCanvas(this.mainGraphState.currentPerspective().rangeX[0], this.mainGraphState.currentPerspective().rangeX[1], this.mainGraphState.currentPerspective().rangeY[0], this.mainGraphState.currentPerspective().rangeY[1]);
    }

    public togglePerspective(){
        this.setPerspective(this.mainGraphState.useSentPerspective ? false : true, true);
    }

    public resetZoom(){
        this.mainGraphState.currentPerspective().rangeX = this.mainGraphState.currentPerspective().originalRangeX;
        this.mainGraphState.currentPerspective().rangeY = this.mainGraphState.currentPerspective().originalRangeY;

        this.redrawCanvas(this.mainGraphState.currentPerspective().rangeX[0], this.mainGraphState.currentPerspective().rangeX[1], this.mainGraphState.currentPerspective().rangeY[0], this.mainGraphState.currentPerspective().rangeY[1]);
    }

    private onBrushXEnd(){
        const selection = d3.event.selection;

        // Convert screen-space coordinates to graph coords
        const dragStartX = this.mainGraphState.currentPerspective().xScale!.invert(selection[0]);
        const dragStopX = this.mainGraphState.currentPerspective().xScale!.invert(selection[1]);

        // New dimensions
        const [minX, maxX] = dragStartX < dragStopX ? [dragStartX, dragStopX] : [dragStopX, dragStartX];
        const [minY, maxY] = this.findYExtrema(minX, maxX);

        this.redrawCanvas(minX, maxX, minY, maxY);

        this.usePanning(); // Switch back to panning mode
        this.mainGraphState.brushXElement!.call(this.mainGraphState.brushX!.move, null); // Clear brush highlight
    }

    private onBrush2dEnd(){
        const selection = d3.event.selection;

        // Convert screen-space coordinates to graph coords
        const dragStartX = this.mainGraphState.currentPerspective().xScale!.invert(selection[0][0]);
        const dragStopX = this.mainGraphState.currentPerspective().xScale!.invert(selection[1][0]);
        const dragStartY = this.mainGraphState.currentPerspective().yScale!.invert(selection[0][1]);
        const dragStopY = this.mainGraphState.currentPerspective().yScale!.invert(selection[1][1]);

        // New dimensions
        const [minX, maxX] = dragStartX < dragStopX ? [dragStartX, dragStopX] : [dragStopX, dragStartX];
        const [minY, maxY] = dragStartY < dragStopY ? [dragStartY, dragStopY] : [dragStopY, dragStartY];

        this.redrawCanvas(minX, maxX, minY, maxY);

        this.usePanning(); // Switch back to panning mode
        this.mainGraphState.brush2dElement!.call(this.mainGraphState.brush2d!.move, null); // Clear brush highlight
    }

    private onPickerClick(){
        const svgClickCoords = d3.mouse(d3.event.currentTarget);
        const graphCoords = [this.mainGraphState.currentPerspective().xScale!.invert(svgClickCoords[0]), this.mainGraphState.currentPerspective().yScale!.invert(svgClickCoords[1])];

        const pixelData = this.mainGraphState.canvasContext!.getImageData(svgClickCoords[0], svgClickCoords[1], 1, 1).data;
        const pixelColor = [ pixelData[0], pixelData[1], pixelData[2] ];

        this.mainGraphState.eventBus!.dispatchEvent(new CustomEvent('packetPickEvent', {
            detail: {
                x: graphCoords[0],
                y: graphCoords[1],
                pixelColor: pixelColor,
            },
        }));
    }

    // Sigmoid-like
    private xScalingFunction(x: number): number {
        return (1 / (1 + Math.exp(-(x - 2) ))) + 1.2;
    }

    // Asymptotic towards 1
    private yScalingFunction(y: number): number {
        return (1 / y) + 1;
    }

    // Searches for the min and max Y values (data sent/received) in a range
    private findYExtrema(minX: number, maxX: number): [number, number] {
        let min = Infinity;
        let max = 0;

        const packetList = this.mainGraphState.useSentPerspective ? this.packetsSent : this.packetsReceived;

        for (const packet of packetList) {
            const parsedPacket = this.config.connection!.parseEvent(packet);
            const extraData = ((packet as any) as IEventExtension).qvis.congestion;

            if (minX <= parsedPacket.time && parsedPacket.time <= maxX) {
                min = min > extraData.to ? extraData.to : min;
                max = max < extraData.to ? extraData.to : max;
            }
        }

        return [min, max];
    }

    // Returns [minCongestionY, maxCongestionY, minRTT, maxRTT];
    // Optionally, a range of [minX, maxX] can be passed within which the y extrema must be located
    private findMetricUpdateExtrema(range?: [number, number]): [number, number, number, number] {
        let minCongestionY = 0;
        let maxCongestionY = 0;
        let minRTT = 0;
        let maxRTT = 0;

        const minX = range !== undefined ? range[0] : this.mainGraphState.currentPerspective().originalRangeX[0];
        const maxX = range !== undefined ? range[1] : this.mainGraphState.currentPerspective().originalRangeX[1];

        const metricUpdates = this.metricUpdates;

        for (const update of metricUpdates) {
            const parsedUpdate = this.config.connection!.parseEvent(update);
            const data = parsedUpdate.data;

            if (data.bytes_in_flight && minX <= parsedUpdate.time && parsedUpdate.time <= maxX) {
                const y = data.bytes_in_flight;
                minCongestionY = minCongestionY > y ? y : minCongestionY;
                maxCongestionY = maxCongestionY < y ? y : maxCongestionY;
            }
            if (data.cwnd && minX <= parsedUpdate.time && parsedUpdate.time <= maxX) {
                const y = data.cwnd;
                minCongestionY = minCongestionY > y ? y : minCongestionY;
                maxCongestionY = maxCongestionY < y ? y : maxCongestionY;
            }
            if (data.min_rtt && minX <= parsedUpdate.time && parsedUpdate.time <= maxX) {
                const y = parsedUpdate.timeToMilliseconds(data.min_rtt);
                minRTT = minRTT > y ? y : minRTT;
                maxRTT = maxRTT < y ? y : maxRTT;
            }
            if (data.smoothed_rtt && minX <= parsedUpdate.time && parsedUpdate.time <= maxX) {
                const y = parsedUpdate.timeToMilliseconds(data.smoothed_rtt);
                minRTT = minRTT > y ? y : minRTT;
                maxRTT = maxRTT < y ? y : maxRTT;
            }
            if (data.latest_rtt && minX <= parsedUpdate.time && parsedUpdate.time <= maxX) {
                const y = parsedUpdate.timeToMilliseconds(data.latest_rtt);
                minRTT = minRTT > y ? y : minRTT;
                maxRTT = maxRTT < y ? y : maxRTT;
            }
        }

        return [minCongestionY, maxCongestionY, minRTT, maxRTT];
    }

    private createPrivateNamespace(obj: any): void {
        if (obj.qvis === undefined) {
            Object.defineProperty(obj, "qvis", { enumerable: false, value: {} });
        }

        if (obj.qvis.congestion === undefined ) {
            obj.qvis.congestion = {
                correspondingPackets: [],
            };
        }
    }

    private fixMetricUpdates(originalUpdates: Array<[number, number]>) {
        const output: Array<[number, number]> = [];

        if( originalUpdates.length == 0 ) {
            return output;
        }

        let lastValue = 0;
        for( let point of originalUpdates ){
            if( originalUpdates.length > 0 ) {
                output.push( [point[0], lastValue] );
            }

            output.push( point );
            lastValue = point[1];
        }
        // the final point should go all the way to the right
        output.push( [ this.mainGraphState.currentPerspective().originalRangeX[1] + 1,  output[ output.length - 1 ][1] ] );
        //output[0][0] = 0; // let's it start at the 0-point of the x-axis

        return output;
    }
}

interface IEventExtension {
    qvis: {
        congestion: {
            from: number,
            to: number,
            correspondingPackets: Array<Array<any>>, // List of pointers to the packets the loss or ack refers to
            correspondingAck?: Array<any>, // Pointer to the ack event
            correspondingLoss?: Array<any>, // Pointer to the loss event
        },
    },
}
