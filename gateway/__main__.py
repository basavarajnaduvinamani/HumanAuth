"""Run the gateway: python -m gateway [--host 127.0.0.1] [--port 5000]"""
import argparse

from .app import create_app

p = argparse.ArgumentParser(description="HumanAuth verification gateway")
p.add_argument("--host", default="127.0.0.1")
p.add_argument("--port", type=int, default=5000)
args = p.parse_args()
create_app().run(host=args.host, port=args.port, debug=False)
