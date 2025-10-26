"""
Metrics collection for Prometheus-style monitoring.
"""

from collections import defaultdict


class MetricsCollector:
    """Simple metrics collector for Prometheus-style metrics."""

    def __init__(self):
        # Counters: always incrementing
        self.counters: dict[str, float] = defaultdict(float)

        # Histograms: track distribution of values
        self.histograms: dict[str, list[float]] = defaultdict(list)

        # Gauges: current value
        self.gauges: dict[str, float] = defaultdict(float)

        # Labels for metrics
        self.metric_labels: dict[str, dict[str, str]] = {}

    def increment_counter(self, name: str, value: float = 1.0, labels: dict[str, str] = None):
        """Increment a counter metric."""
        key = self._make_key(name, labels)
        self.counters[key] += value
        if labels:
            self.metric_labels[key] = labels

    def observe_histogram(self, name: str, value: float, labels: dict[str, str] = None):
        """Record a value in a histogram."""
        key = self._make_key(name, labels)
        self.histograms[key].append(value)
        if labels:
            self.metric_labels[key] = labels

        # Keep only last 1000 values to prevent memory bloat
        if len(self.histograms[key]) > 1000:
            self.histograms[key] = self.histograms[key][-1000:]

    def set_gauge(self, name: str, value: float, labels: dict[str, str] = None):
        """Set a gauge value."""
        key = self._make_key(name, labels)
        self.gauges[key] = value
        if labels:
            self.metric_labels[key] = labels

    def _make_key(self, name: str, labels: dict[str, str] = None) -> str:
        """Create a unique key for a metric with labels."""
        if not labels:
            return name

        label_str = ",".join(f'{k}="{v}"' for k, v in sorted(labels.items()))
        return f"{name}{{{label_str}}}"

    def get_prometheus_format(self) -> str:
        """Export metrics in Prometheus text format."""
        lines = []

        # Export counters
        for key, value in self.counters.items():
            lines.append(f"{key} {value}")

        # Export histograms
        for key, values in self.histograms.items():
            if values:
                # Calculate percentiles
                sorted_values = sorted(values)
                count = len(sorted_values)

                # Export as histogram buckets
                p50 = sorted_values[int(count * 0.5)] if count > 0 else 0
                p95 = sorted_values[int(count * 0.95)] if count > 0 else 0
                p99 = sorted_values[int(count * 0.99)] if count > 0 else 0

                lines.append(f"{key}_count {count}")
                lines.append(f"{key}_sum {sum(values)}")
                lines.append(f"{key}_p50 {p50}")
                lines.append(f"{key}_p95 {p95}")
                lines.append(f"{key}_p99 {p99}")

        # Export gauges
        for key, value in self.gauges.items():
            lines.append(f"{key} {value}")

        return "\n".join(lines) + "\n"


# Global metrics instance
metrics = MetricsCollector()


def record_fetch_metrics(feed_id: int, host: str, status_code: int,
                         duration_ms: int, items_found: int, items_new: int):
    """Record metrics for a feed fetch operation."""
    labels = {"feed_id": str(feed_id), "host": host, "status": str(status_code)}

    # Record duration as histogram
    metrics.observe_histogram("feeder_fetch_duration_seconds", duration_ms / 1000.0, labels)

    # Record errors
    if status_code >= 400:
        metrics.increment_counter("feeder_fetch_errors_total", labels={"host": host, "reason": str(status_code)})

    # Record new items
    if items_new > 0:
        metrics.increment_counter("feeder_items_new_total", value=items_new, labels={"feed_id": str(feed_id)})


def record_scheduler_metrics(queue_depth: int):
    """Record scheduler queue depth."""
    metrics.set_gauge("feeder_scheduler_queue_depth", queue_depth)

