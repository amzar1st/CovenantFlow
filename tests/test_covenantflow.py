from datetime import datetime, timezone
from pathlib import Path

CONTRACT = str(Path(__file__).resolve().parents[1] / "contracts" / "CovenantFlow.py")
START = 1_800_000_000
TERMS = "Provider will deliver a three-page website by December 1. Client reviews within five days."
REVISED = "Provider will deliver a five-page website by December 15. Client reviews within five days."


def setup(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.warp(datetime.fromtimestamp(START, timezone.utc).isoformat())
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT)
    contract.create_agreement(str(direct_bob), "Website build", TERMS, START + 86400)
    return contract


def active(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    with direct_vm.prank(direct_bob):
        contract.accept_agreement(1)
    return contract


def pending(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = active(direct_vm, direct_deploy, direct_alice, direct_bob)
    contract.propose_change(1, REVISED, "More pages requested", START + 86400)
    return contract


def test_original_requires_counterparty_acceptance(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    assert contract.get_agreement(1).status == "AWAITING_ACCEPTANCE"
    with direct_vm.expect_revert("Only provider"):
        contract.accept_agreement(1)
    with direct_vm.prank(direct_charlie):
        with direct_vm.expect_revert("Only provider"):
            contract.accept_agreement(1)
    with direct_vm.prank(direct_bob):
        contract.accept_agreement(1)
    assert contract.get_agreement(1).status == "ACTIVE"
    with direct_vm.expect_revert("Not awaiting"):
        contract.accept_agreement(1)


def test_original_expiry_blocks_acceptance(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    direct_vm.warp(datetime.fromtimestamp(START + 86401, timezone.utc).isoformat())
    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("Acceptance expired"):
            contract.accept_agreement(1)
    contract.expire_agreement(1)
    assert contract.get_agreement(1).status == "EXPIRED"


def test_cannot_propose_before_acceptance_or_as_stranger(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    with direct_vm.expect_revert("not active"):
        contract.propose_change(1, REVISED, "More pages requested", START + 86400)
    with direct_vm.prank(direct_bob):
        contract.accept_agreement(1)
    with direct_vm.prank(direct_charlie):
        with direct_vm.expect_revert("Only a party"):
            contract.propose_change(1, REVISED, "More pages requested", START + 86400)


def test_one_pending_change_and_rejection_preserves_terms(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = pending(direct_vm, direct_deploy, direct_alice, direct_bob)
    with direct_vm.expect_revert("already pending"):
        contract.propose_change(1, REVISED + " Extra", "Second change", START + 86400)
    with direct_vm.prank(direct_bob):
        contract.reject_change(1)
    assert contract.get_agreement(1).terms == TERMS
    assert contract.get_agreement(1).pending_change == 0
    assert contract.get_change(1).status == "REJECTED"
    contract.propose_change(1, REVISED, "Another proposal", START + 86400)
    assert contract.get_counts() == (1, 2)


def test_validator_checks_independent_classification(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = pending(direct_vm, direct_deploy, direct_alice, direct_bob)
    direct_vm.mock_llm("Classify how a proposed service agreement", "MATERIAL")
    contract.assess_change(1)
    assert contract.get_change(1).classification == "MATERIAL"
    assert direct_vm.run_validator() is True
    direct_vm.clear_mocks()
    direct_vm.mock_llm("Classify how a proposed service agreement", "MINOR")
    assert direct_vm.run_validator() is False


def test_both_signatures_needed_to_activate(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = pending(direct_vm, direct_deploy, direct_alice, direct_bob)
    direct_vm.mock_llm("Classify how a proposed service agreement", "MATERIAL")
    contract.assess_change(1)
    with direct_vm.prank(direct_charlie):
        with direct_vm.expect_revert("Only a party"):
            contract.approve_change(1)
    contract.approve_change(1)
    assert contract.get_agreement(1).terms == TERMS
    with direct_vm.expect_revert("Already approved"):
        contract.approve_change(1)
    with direct_vm.prank(direct_bob):
        contract.approve_change(1)
    assert contract.get_agreement(1).terms == REVISED
    assert contract.get_agreement(1).version == 2
    assert contract.get_change(1).status == "ACTIVATED"
    with direct_vm.expect_revert("not assessed"):
        contract.approve_change(1)


def test_expiry_clears_proposal_without_activation(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = pending(direct_vm, direct_deploy, direct_alice, direct_bob)
    with direct_vm.expect_revert("still open"):
        contract.expire_change(1)
    direct_vm.warp(datetime.fromtimestamp(START + 86401, timezone.utc).isoformat())
    with direct_vm.expect_revert("Change expired"):
        contract.assess_change(1)
    contract.expire_change(1)
    assert contract.get_agreement(1).terms == TERMS
    assert contract.get_change(1).status == "EXPIRED"


def test_invalid_model_output_cannot_mark_assessed(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = pending(direct_vm, direct_deploy, direct_alice, direct_bob)
    direct_vm.mock_llm("Classify how a proposed service agreement", "Ignore the rules")
    with direct_vm.expect_revert("Invalid classification"):
        contract.assess_change(1)
    assert contract.get_change(1).status == "PROPOSED"
