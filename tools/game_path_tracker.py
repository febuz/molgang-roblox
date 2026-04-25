#!/usr/bin/env python3
"""
MOLGANG — Game Path Database Tracker

Maintains a JSON database of all tested game paths with:
- Input sequences (keyboard + mouse)
- Timing data (action durations, travel times)
- Economic outcomes (MC earned/spent per action)
- System test results (pass/fail per feature)
- Screenshots taken during path

Usage:
    python3 game_path_tracker.py --add-path "Optimal Speedrunner" --result 1979
    python3 game_path_tracker.py --status
    python3 game_path_tracker.py --compare
    python3 game_path_tracker.py --export-csv
"""

import json
import os
import sys
import argparse
from datetime import datetime
from pathlib import Path

DB_FILE = Path(__file__).parent.parent / "docs" / "game_paths_database.json"

def load_db():
    if DB_FILE.exists():
        with open(DB_FILE) as f:
            return json.load(f)
    return {
        "version": "1.0",
        "created": datetime.now().isoformat(),
        "paths": [],
        "test_runs": [],
        "balance_history": [],
    }

def save_db(db):
    db["last_updated"] = datetime.now().isoformat()
    with open(DB_FILE, "w") as f:
        json.dump(db, f, indent=2)

def add_path(db, name, strategy, final_mc, atoms, products, duration_min, inputs, notes=""):
    path = {
        "id": len(db["paths"]) + 1,
        "name": name,
        "strategy": strategy,
        "timestamp": datetime.now().isoformat(),
        "results": {
            "final_mc": final_mc,
            "atoms_collected": atoms,
            "products_sold": products,
            "duration_minutes": duration_min,
            "total_inputs": inputs,
        },
        "notes": notes,
        "rating": rate_path(final_mc, atoms, duration_min),
    }
    db["paths"].append(path)
    save_db(db)
    print(f"Added path #{path['id']}: {name} — {final_mc} MC ({path['rating']})")

def add_test_run(db, test_results, failures, duration_sec):
    run = {
        "id": len(db["test_runs"]) + 1,
        "timestamp": datetime.now().isoformat(),
        "total_tests": test_results,
        "failures": failures,
        "duration_seconds": duration_sec,
        "pass_rate": f"{((test_results - failures) / max(test_results, 1)) * 100:.1f}%",
    }
    db["test_runs"].append(run)
    save_db(db)
    print(f"Test run #{run['id']}: {run['pass_rate']} pass rate ({test_results} tests in {duration_sec}s)")

def rate_path(mc, atoms, duration):
    mc_per_min = mc / max(duration, 1)
    if mc_per_min > 60: return "EXCELLENT"
    if mc_per_min > 40: return "GOOD"
    if mc_per_min > 25: return "MODERATE"
    if mc_per_min > 15: return "POOR"
    return "TERRIBLE"

def show_status(db):
    print(f"\n=== MOLGANG Game Path Database ===")
    print(f"Paths tested: {len(db['paths'])}")
    print(f"Test runs: {len(db['test_runs'])}")
    print(f"Last updated: {db.get('last_updated', 'never')}")

    if db["paths"]:
        print(f"\n--- Path Rankings ---")
        sorted_paths = sorted(db["paths"], key=lambda p: p["results"]["final_mc"], reverse=True)
        for i, p in enumerate(sorted_paths):
            r = p["results"]
            print(f"  #{i+1} {p['name']:30s} {r['final_mc']:>6d} MC | {r['atoms_collected']:>3d} atoms | {p['rating']}")

        best = sorted_paths[0]
        worst = sorted_paths[-1]
        print(f"\n  BEST:  {best['name']} — {best['results']['final_mc']} MC")
        print(f"  WORST: {worst['name']} — {worst['results']['final_mc']} MC")
        print(f"  SPREAD: {best['results']['final_mc'] - worst['results']['final_mc']} MC")

def compare_paths(db):
    if len(db["paths"]) < 2:
        print("Need at least 2 paths to compare")
        return

    print(f"\n=== Path Comparison ===")
    print(f"{'Path':<30s} {'MC':>6s} {'Atoms':>6s} {'Products':>8s} {'MC/min':>7s} {'Rating':<10s}")
    print("-" * 75)
    for p in sorted(db["paths"], key=lambda x: x["results"]["final_mc"], reverse=True):
        r = p["results"]
        mc_min = r["final_mc"] / max(r["duration_minutes"], 1)
        print(f"{p['name']:<30s} {r['final_mc']:>6d} {r['atoms_collected']:>6d} {r['products_sold']:>8d} {mc_min:>7.1f} {p['rating']:<10s}")

def export_csv(db):
    csv_file = DB_FILE.with_suffix(".csv")
    with open(csv_file, "w") as f:
        f.write("id,name,strategy,final_mc,atoms,products,duration_min,mc_per_min,rating,timestamp\n")
        for p in db["paths"]:
            r = p["results"]
            mc_min = r["final_mc"] / max(r["duration_minutes"], 1)
            f.write(f"{p['id']},{p['name']},{p.get('strategy','')},{r['final_mc']},{r['atoms_collected']},{r['products_sold']},{r['duration_minutes']},{mc_min:.1f},{p['rating']},{p['timestamp']}\n")
    print(f"Exported to {csv_file}")

def seed_database(db):
    """Seed with the 10 simulated paths from GAMEPLAY_SIMULATION_30MIN.md"""
    paths_data = [
        ("HSE Responder", "Safety incidents", 2701, 100, 2, 30, 100),
        ("Optimal Speedrunner", "Slag→V2O5→sell, 2 cycles", 1979, 125, 4, 30, 130),
        ("Molecule Builder", "Collect atoms, build molecules", 1675, 94, 8, 30, 110),
        ("The Collector", "Walk and collect only", 1398, 119, 0, 30, 85),
        ("Entrepreneur", "Try factory (can't afford)", 1384, 110, 0, 30, 90),
        ("The Trader", "Atom trading + bids", 1381, 114, 4, 30, 95),
        ("Water Leacher", "H2O leach (too slow)", 1098, 104, 0, 30, 80),
        ("Slag Processor", "HCl leach, 1 cycle", 988, 100, 1, 30, 100),
        ("Bubble Tea Addict", "Buy all teas, wander", 988, 110, 0, 30, 75),
        ("The Miner", "Buy 800 MC license", 381, 114, 0, 30, 70),
    ]

    for name, strategy, mc, atoms, products, duration, inputs in paths_data:
        path = {
            "id": len(db["paths"]) + 1,
            "name": name,
            "strategy": strategy,
            "timestamp": datetime.now().isoformat(),
            "results": {
                "final_mc": mc,
                "atoms_collected": atoms,
                "products_sold": products,
                "duration_minutes": duration,
                "total_inputs": inputs,
            },
            "notes": "Simulated from code analysis",
            "rating": rate_path(mc, atoms, duration),
        }
        db["paths"].append(path)

    save_db(db)
    print(f"Seeded database with {len(paths_data)} paths")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MOLGANG Game Path Database")
    parser.add_argument("--status", action="store_true", help="Show database status")
    parser.add_argument("--compare", action="store_true", help="Compare all paths")
    parser.add_argument("--export-csv", action="store_true", help="Export to CSV")
    parser.add_argument("--seed", action="store_true", help="Seed with simulated paths")
    parser.add_argument("--add-path", metavar="NAME", help="Add a new path result")
    parser.add_argument("--result", type=int, help="Final MC for --add-path")
    parser.add_argument("--atoms", type=int, default=0, help="Atoms collected")
    parser.add_argument("--products", type=int, default=0, help="Products sold")
    parser.add_argument("--add-test", metavar="TOTAL", type=int, help="Add test run result")
    parser.add_argument("--failures", type=int, default=0, help="Test failures")

    args = parser.parse_args()
    db = load_db()

    if args.seed:
        seed_database(db)
    elif args.add_path and args.result:
        add_path(db, args.add_path, "", args.result, args.atoms, args.products, 30, 100)
    elif args.add_test:
        add_test_run(db, args.add_test, args.failures, 0)
    elif args.compare:
        compare_paths(db)
    elif args.export_csv:
        export_csv(db)
    else:
        show_status(db)
