from scenarios.defaults import SCENARIO_DEFAULTS


def test_scenario_defaults_include_required_profiles() -> None:
    scenario_ids = {scenario["id"] for scenario in SCENARIO_DEFAULTS}
    assert "realistic-physics" in scenario_ids
    assert "fictional-drive" in scenario_ids


def test_scenario_defaults_include_assumptions_and_non_canon_disclaimer() -> None:
    for scenario in SCENARIO_DEFAULTS:
        assert len(scenario["assumptions"]) >= 3
        assert "non-canon" in scenario["disclaimer"].lower()
