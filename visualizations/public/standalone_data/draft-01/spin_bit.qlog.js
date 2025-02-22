var spin_bit = {
    "qlog_version": "draft-01",
    "description": "",
    "traces": [
        {
            "title": "Connection 1",
            "vantage_point": {
                "name": "TODO",
                "type": "network",
                "flow": "client"
            },
            "configuration": {
                "time_offset": "0",
                "time_units": "ms",
                "original_uris": [
                    "file:///home/tom/Code/pcap2qlog/examples/draft-01/spin_bit.json"
                ]
            },
            "common_fields": {
                "group_id": "1b51237b269288d6",
                "protocol_type": "QUIC",
                "reference_time": "1564682471.651907"
            },
            "event_fields": [
                "relative_time",
                "category",
                "event",
                "trigger",
                "data"
            ],
            "events": [
                [
                    "0",
                    "connectivity",
                    "connection_new",
                    "line",
                    {
                        "ip_version": "4",
                        "src_ip": "66.70.231.124",
                        "dst_ip": "51.15.3.76",
                        "transport_protocol": "UDP",
                        "src_port": "52740",
                        "dst_port": "4433",
                        "quic_version": "0xff000016",
                        "src_cid": "1b51237b269288d6",
                        "dst_cid": "0f721e1c6aae0420"
                    }
                ],
                [
                    "0",
                    "transport",
                    "packet_sent",
                    "line",
                    {
                        "type": "initial",
                        "header": {
                            "version": "0xff000016",
                            "scid": "1b51237b269288d6",
                            "dcid": "0f721e1c6aae0420",
                            "scil": "8",
                            "dcil": "8",
                            "payload_length": 1224,
                            "packet_number": "0",
                            "packet_size": 1251
                        },
                        "frames": [
                            {
                                "frame_type": "crypto",
                                "offset": "0",
                                "length": "278"
                            },
                            {
                                "frame_type": "padding"
                            }
                        ]
                    }
                ],
                [
                    "93",
                    "transport",
                    "packet_received",
                    "line",
                    {
                        "type": "initial",
                        "header": {
                            "version": "0xff000016",
                            "scid": "9605d1700dd8829c",
                            "dcid": "1b51237b269288d6",
                            "scil": "8",
                            "dcil": "8",
                            "payload_length": 181,
                            "packet_number": "0",
                            "packet_size": 208
                        },
                        "frames": [
                            {
                                "frame_type": "ack",
                                "ack_delay": "451",
                                "acked_ranges": [
                                    [
                                        "0",
                                        "0"
                                    ]
                                ]
                            },
                            {
                                "frame_type": "crypto",
                                "offset": "0",
                                "length": "155"
                            }
                        ]
                    }
                ],
                [
                    "93",
                    "connectivity",
                    "connection_id_update",
                    "line",
                    {
                        "dst_old": "0f721e1c6aae0420",
                        "dst_new": "9605d1700dd8829c"
                    }
                ],
                [
                    "93",
                    "transport",
                    "packet_received",
                    "line",
                    {
                        "type": "handshake",
                        "header": {
                            "version": "0xff000016",
                            "scid": "9605d1700dd8829c",
                            "dcid": "1b51237b269288d6",
                            "scil": "8",
                            "dcil": "8",
                            "payload_length": 600,
                            "packet_number": "0",
                            "packet_size": 626
                        },
                        "frames": [
                            {
                                "frame_type": "crypto",
                                "offset": "0",
                                "length": "580"
                            }
                        ]
                    }
                ],
                [
                    "93",
                    "transport",
                    "ALPN_update",
                    {
                        "old": "",
                        "new": "hq-22"
                    }
                ],
                [
                    "97",
                    "transport",
                    "packet_sent",
                    "line",
                    {
                        "type": "initial",
                        "header": {
                            "version": "0xff000016",
                            "scid": "1b51237b269288d6",
                            "dcid": "9605d1700dd8829c",
                            "scil": "8",
                            "dcil": "8",
                            "payload_length": 22,
                            "packet_number": "1",
                            "packet_size": 48
                        },
                        "frames": [
                            {
                                "frame_type": "ack",
                                "ack_delay": "389",
                                "acked_ranges": [
                                    [
                                        "0",
                                        "0"
                                    ]
                                ]
                            }
                        ]
                    }
                ],
                [
                    "98",
                    "transport",
                    "packet_sent",
                    "line",
                    {
                        "type": "handshake",
                        "header": {
                            "version": "0xff000016",
                            "scid": "1b51237b269288d6",
                            "dcid": "9605d1700dd8829c",
                            "scil": "8",
                            "dcil": "8",
                            "payload_length": 77,
                            "packet_number": "0",
                            "packet_size": 103
                        },
                        "frames": [
                            {
                                "frame_type": "ack",
                                "ack_delay": "545",
                                "acked_ranges": [
                                    [
                                        "0",
                                        "0"
                                    ]
                                ]
                            },
                            {
                                "frame_type": "crypto",
                                "offset": "0",
                                "length": "52"
                            }
                        ]
                    }
                ],
                [
                    "100",
                    "transport",
                    "packet_received",
                    "line",
                    {
                        "type": "1RTT",
                        "header": {
                            "dcid": "1b51237b269288d6",
                            "payload_length": 128,
                            "packet_number": "0",
                            "packet_size": 138
                        },
                        "frames": [
                            {
                                "frame_type": "new_connection_id",
                                "retire_prior_to": "0",
                                "sequence_number": "4",
                                "connection_id": "b6d99a21a5520037",
                                "length": "8",
                                "reset_token": "c8b17dea7e522c4e2e226a30baf67ecd"
                            },
                            {
                                "frame_type": "new_connection_id",
                                "retire_prior_to": "0",
                                "sequence_number": "3",
                                "connection_id": "9ea9d2d7fe0968af",
                                "length": "8",
                                "reset_token": "65c029e5897850b701041d8282a41ed0"
                            },
                            {
                                "frame_type": "new_connection_id",
                                "retire_prior_to": "0",
                                "sequence_number": "2",
                                "connection_id": "dc1e741dd48a68f0",
                                "length": "8",
                                "reset_token": "821b8b277bae3b95628bbc91d61ac863"
                            },
                            {
                                "frame_type": "new_connection_id",
                                "retire_prior_to": "0",
                                "sequence_number": "1",
                                "connection_id": "85355bb1f6a57ff9",
                                "length": "8",
                                "reset_token": "4300194ae56baba583eafe6853467617"
                            }
                        ]
                    }
                ],
                [
                    "101",
                    "transport",
                    "packet_sent",
                    "line",
                    {
                        "type": "1RTT",
                        "header": {
                            "dcid": "9605d1700dd8829c",
                            "payload_length": 36,
                            "packet_number": "0",
                            "packet_size": 46
                        },
                        "frames": [
                            {
                                "frame_type": "stream",
                                "id": "0",
                                "offset": "0",
                                "length": "17",
                                "fin": true
                            }
                        ]
                    }
                ],
                [
                    "103",
                    "transport",
                    "packet_sent",
                    "line",
                    {
                        "type": "1RTT",
                        "header": {
                            "dcid": "9605d1700dd8829c",
                            "payload_length": 22,
                            "packet_number": "1",
                            "packet_size": 32
                        },
                        "frames": [
                            {
                                "frame_type": "ack",
                                "ack_delay": "348",
                                "acked_ranges": [
                                    [
                                        "0",
                                        "0"
                                    ]
                                ]
                            }
                        ]
                    }
                ],
                [
                    "103",
                    "connectivity",
                    "spin_bit_update",
                    "line",
                    {
                        "state": true
                    }
                ],
                [
                    "208",
                    "transport",
                    "packet_received",
                    "line",
                    {
                        "type": "handshake",
                        "header": {
                            "version": "0xff000016",
                            "scid": "9605d1700dd8829c",
                            "dcid": "1b51237b269288d6",
                            "scil": "8",
                            "dcil": "8",
                            "payload_length": 21,
                            "packet_number": "1",
                            "packet_size": 47
                        },
                        "frames": [
                            {
                                "frame_type": "ack",
                                "ack_delay": "9",
                                "acked_ranges": [
                                    [
                                        "0",
                                        "0"
                                    ]
                                ]
                            }
                        ]
                    }
                ],
                [
                    "208",
                    "transport",
                    "packet_received",
                    "line",
                    {
                        "type": "1RTT",
                        "header": {
                            "dcid": "1b51237b269288d6",
                            "payload_length": 114,
                            "packet_number": "1",
                            "packet_size": 124
                        },
                        "frames": [
                            {
                                "frame_type": "ack",
                                "ack_delay": "9",
                                "acked_ranges": [
                                    [
                                        "0",
                                        "0"
                                    ]
                                ]
                            },
                            {
                                "frame_type": "crypto",
                                "offset": "0",
                                "length": "89"
                            }
                        ]
                    }
                ],
                [
                    "208",
                    "connectivity",
                    "spin_bit_update",
                    "line",
                    {
                        "state": false
                    }
                ],
                [
                    "211",
                    "transport",
                    "packet_sent",
                    "line",
                    {
                        "type": "1RTT",
                        "header": {
                            "dcid": "9605d1700dd8829c",
                            "payload_length": 22,
                            "packet_number": "2",
                            "packet_size": 32
                        },
                        "frames": [
                            {
                                "frame_type": "ack",
                                "ack_delay": "322",
                                "acked_ranges": [
                                    [
                                        "0",
                                        "1"
                                    ]
                                ]
                            }
                        ]
                    }
                ],
                [
                    "211",
                    "connectivity",
                    "spin_bit_update",
                    "line",
                    {
                        "state": true
                    }
                ],
                [
                    "218",
                    "transport",
                    "packet_received",
                    "line",
                    {
                        "type": "1RTT",
                        "header": {
                            "dcid": "1b51237b269288d6",
                            "payload_length": 23,
                            "packet_number": "2",
                            "packet_size": 33
                        },
                        "frames": [
                            {
                                "frame_type": "ack",
                                "ack_delay": "16",
                                "acked_ranges": [
                                    [
                                        "0",
                                        "1"
                                    ]
                                ]
                            },
                            {
                                "frame_type": "max_streams",
                                "maximum": "33"
                            }
                        ]
                    }
                ],
                [
                    "220",
                    "transport",
                    "packet_sent",
                    "line",
                    {
                        "type": "1RTT",
                        "header": {
                            "dcid": "9605d1700dd8829c",
                            "payload_length": 22,
                            "packet_number": "3",
                            "packet_size": 32
                        },
                        "frames": [
                            {
                                "frame_type": "ack",
                                "ack_delay": "310",
                                "acked_ranges": [
                                    [
                                        "0",
                                        "2"
                                    ]
                                ]
                            }
                        ]
                    }
                ],
                [
                    "220",
                    "connectivity",
                    "spin_bit_update",
                    "line",
                    {
                        "state": false
                    }
                ],
                [
                    "224",
                    "transport",
                    "packet_received",
                    "line",
                    {
                        "type": "1RTT",
                        "header": {
                            "dcid": "1b51237b269288d6",
                            "payload_length": 238,
                            "packet_number": "3",
                            "packet_size": 248
                        },
                        "frames": [
                            {
                                "frame_type": "ack",
                                "ack_delay": "1394",
                                "acked_ranges": [
                                    [
                                        "0",
                                        "1"
                                    ]
                                ]
                            },
                            {
                                "frame_type": "max_data",
                                "maximum": "10000017"
                            },
                            {
                                "frame_type": "stream",
                                "id": "0",
                                "offset": "0",
                                "length": "207",
                                "fin": true
                            }
                        ]
                    }
                ],
                [
                    "224",
                    "connectivity",
                    "spin_bit_update",
                    "line",
                    {
                        "state": true
                    }
                ],
                [
                    "227",
                    "transport",
                    "packet_sent",
                    "line",
                    {
                        "type": "1RTT",
                        "header": {
                            "dcid": "9605d1700dd8829c",
                            "payload_length": 73,
                            "packet_number": "4",
                            "packet_size": 83
                        },
                        "frames": [
                            {
                                "frame_type": "max_data",
                                "maximum": "32975"
                            },
                            {
                                "frame_type": "max_stream_data",
                                "id": "0",
                                "maximum": "16591"
                            },
                            {
                                "frame_type": "ack",
                                "ack_delay": "321",
                                "acked_ranges": [
                                    [
                                        "0",
                                        "3"
                                    ]
                                ]
                            },
                            {
                                "frame_type": "stream",
                                "id": "8",
                                "offset": "0",
                                "length": "17",
                                "fin": true
                            },
                            {
                                "frame_type": "stream",
                                "id": "4",
                                "offset": "0",
                                "length": "17",
                                "fin": true
                            }
                        ]
                    }
                ],
                [
                    "227",
                    "connectivity",
                    "spin_bit_update",
                    "line",
                    {
                        "state": false
                    }
                ],
                [
                    "322",
                    "transport",
                    "packet_received",
                    "line",
                    {
                        "type": "1RTT",
                        "header": {
                            "dcid": "1b51237b269288d6",
                            "payload_length": 21,
                            "packet_number": "4",
                            "packet_size": 31
                        },
                        "frames": [
                            {
                                "frame_type": "ack",
                                "ack_delay": "5",
                                "acked_ranges": [
                                    [
                                        "2",
                                        "4"
                                    ]
                                ]
                            }
                        ]
                    }
                ],
                [
                    "328",
                    "transport",
                    "packet_received",
                    "line",
                    {
                        "type": "1RTT",
                        "header": {
                            "dcid": "1b51237b269288d6",
                            "payload_length": 451,
                            "packet_number": "5",
                            "packet_size": 461
                        },
                        "frames": [
                            {
                                "frame_type": "ack",
                                "ack_delay": "1245",
                                "acked_ranges": [
                                    [
                                        "2",
                                        "4"
                                    ]
                                ]
                            },
                            {
                                "frame_type": "max_data",
                                "maximum": "10000051"
                            },
                            {
                                "frame_type": "max_streams",
                                "maximum": "35"
                            },
                            {
                                "frame_type": "stream",
                                "id": "4",
                                "offset": "0",
                                "length": "207",
                                "fin": true
                            },
                            {
                                "frame_type": "stream",
                                "id": "8",
                                "offset": "0",
                                "length": "207",
                                "fin": true
                            }
                        ]
                    }
                ],
                [
                    "331",
                    "transport",
                    "packet_sent",
                    "line",
                    {
                        "type": "1RTT",
                        "header": {
                            "dcid": "9605d1700dd8829c",
                            "payload_length": 39,
                            "packet_number": "5",
                            "packet_size": 49
                        },
                        "frames": [
                            {
                                "frame_type": "max_data",
                                "maximum": "33389"
                            },
                            {
                                "frame_type": "max_stream_data",
                                "id": "4",
                                "maximum": "16591"
                            },
                            {
                                "frame_type": "max_stream_data",
                                "id": "8",
                                "maximum": "16591"
                            },
                            {
                                "frame_type": "ack",
                                "ack_delay": "320",
                                "acked_ranges": [
                                    [
                                        "0",
                                        "5"
                                    ]
                                ]
                            }
                        ]
                    }
                ],
                [
                    "331",
                    "connectivity",
                    "spin_bit_update",
                    "line",
                    {
                        "state": true
                    }
                ],
                [
                    "425",
                    "transport",
                    "packet_received",
                    "line",
                    {
                        "type": "1RTT",
                        "header": {
                            "dcid": "1b51237b269288d6",
                            "payload_length": 21,
                            "packet_number": "6",
                            "packet_size": 31
                        },
                        "frames": [
                            {
                                "frame_type": "ack",
                                "ack_delay": "7",
                                "acked_ranges": [
                                    [
                                        "5",
                                        "5"
                                    ]
                                ]
                            }
                        ]
                    }
                ],
                [
                    "10001",
                    "transport",
                    "packet_sent",
                    "line",
                    {
                        "type": "1RTT",
                        "header": {
                            "dcid": "9605d1700dd8829c",
                            "payload_length": 27,
                            "packet_number": "6",
                            "packet_size": 37
                        },
                        "frames": [
                            {
                                "frame_type": "ack",
                                "ack_delay": "1196985",
                                "acked_ranges": [
                                    [
                                        "0",
                                        "6"
                                    ]
                                ]
                            },
                            {
                                "frame_type": "connection_close",
                                "error_space": "transport_error",
                                "error_code": "http_no_error",
                                "raw_error_code": "0",
                                "reason": ""
                            }
                        ]
                    }
                ],
                [
                    "10001",
                    "connectivity",
                    "connection_close",
                    {
                        "src_id": "1b51237b269288d6"
                    }
                ],
                [
                    "10001",
                    "connectivity",
                    "spin_bit_update",
                    "line",
                    {
                        "state": false
                    }
                ],
                [
                    "10091",
                    "transport",
                    "packet_received",
                    "line",
                    {
                        "type": "1RTT",
                        "header": {
                            "dcid": "1b51237b269288d6",
                            "payload_length": 20,
                            "packet_number": "7",
                            "packet_size": 30
                        },
                        "frames": [
                            {
                                "frame_type": "connection_close",
                                "error_space": "transport_error",
                                "error_code": "no_error",
                                "raw_error_code": "0",
                                "reason": "",
                                "trigger_frame_type": "0"
                            }
                        ]
                    }
                ],
                [
                    "10091",
                    "connectivity",
                    "connection_close",
                    {
                        "src_id": "9605d1700dd8829c"
                    }
                ]
            ]
        }
    ]
}