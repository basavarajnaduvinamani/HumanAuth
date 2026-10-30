from bench.latency import result_prefix


def test_default_benchmark_preserves_previous_hardware_run(tmp_path):
    original = tmp_path / "latency_cpu.json"
    original.write_text("original measurement")
    machine = {"cpu": "Sample CPU"}
    first = result_prefix(None, machine, tmp_path)
    first.with_suffix(".json").write_text("previous machine measurement")
    second = result_prefix(None, machine, tmp_path)
    assert second != first
    assert original.read_text() == "original measurement"
    assert first.with_suffix(".json").read_text() == "previous machine measurement"
    assert not second.with_suffix(".json").exists()
