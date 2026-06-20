#!/usr/bin/env python3
"""Tiny mock LM Studio OpenAI-compatible server for integration tests."""
import json, http.server, socketserver

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        if self.path == '/v1/models':
            self.wfile.write(json.dumps({'data': [{'id': 'smollm-135m', 'object': 'model'}]}).encode())
        else:
            self.wfile.write(json.dumps({}).encode())

    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        if self.path == '/v1/chat/completions':
            self.wfile.write(json.dumps({
                'id': 'cmpl-1',
                'model': 'smollm-135m',
                'choices': [{
                    'message': {'role': 'assistant', 'content': 'Mock real model says hello from smollm-135m.'},
                    'finish_reason': 'stop'
                }],
                'usage': {'prompt_tokens': 10, 'completion_tokens': 12, 'total_tokens': 22}
            }).encode())
        else:
            self.wfile.write(json.dumps({}).encode())

    def log_message(self, fmt, *args): pass

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('127.0.0.1', 1234), Handler) as srv:
        srv.serve_forever()
