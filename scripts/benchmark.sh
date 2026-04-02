#!/bin/bash

# WBS Performance Benchmarking Script
# Usage: ./scripts/benchmark.sh [iterations]

ITERATIONS=${1:-1}
RESULTS_FILE="benchmark-results.json"

echo "🚀 WBS Performance Benchmarking"
echo "================================"
echo "Iterations: $ITERATIONS"
echo ""

# Initialize results file
echo "{\"runs\": []}" > "$RESULTS_FILE"

run_benchmark() {
  local i=$1
  echo "Run $i/$ITERATIONS..."
  
  # Run tests and capture duration
  START=$(date +%s%N)
  NODE_ENV=test npm test --run > /dev/null 2>&1
  END=$(date +%s%N)
  
  # Calculate duration in milliseconds
  DURATION=$(( (END - START) / 1000000 ))
  DURATION_SEC=$(echo "scale=2; $DURATION / 1000" | bc)
  
  echo "  Duration: ${DURATION_SEC}s"
  
  # Append to results (simple JSON append)
  python3 -c "
import json
with open('$RESULTS_FILE', 'r') as f:
    data = json.load(f)
data['runs'].append({'run': $i, 'duration_ms': $DURATION})
with open('$RESULTS_FILE', 'w') as f:
    json.dump(data, f, indent=2)
"
}

# Run benchmarks
for ((i=1; i<=ITERATIONS; i++)); do
  run_benchmark $i
done

# Calculate statistics
python3 << 'EOF'
import json
import statistics

with open("benchmark-results.json", "r") as f:
    data = json.load(f)

durations = [r["duration_ms"] for r in data["runs"]]
avg = statistics.mean(durations)
min_val = min(durations)
max_val = max(durations)
median = statistics.median(durations)

print("\n📊 Benchmark Results")
print("====================")
print(f"Average:   {avg/1000:.2f}s")
print(f"Median:    {median/1000:.2f}s")
print(f"Min:       {min_val/1000:.2f}s")
print(f"Max:       {max_val/1000:.2f}s")

if len(durations) > 1:
    stddev = statistics.stdev(durations)
    print(f"Std Dev:   {stddev/1000:.2f}s")
    print(f"Variance:  {(stddev/avg)*100:.1f}%")

print(f"\nSaved vs baseline (79.07s): {(79.07 - avg/1000):.2f}s ({100*(79.07 - avg/1000)/79.07:.1f}%)")
EOF
