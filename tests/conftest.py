"""Minimal deterministic GenLayer stand-in for local contract state-machine tests.

This exercises the actual contract source and authorization paths without
claiming to run GenVM or network consensus. Live Studio verification is separate.
"""
import contextlib
import importlib.util
import re
import sys
import types
from datetime import datetime
import pytest


class VM:
    def __init__(self):
        self.sender = "0x" + "a" * 40
        self.timestamp = 1_800_000_000
        self.mocks = []
        self.validator = None

    def warp(self, timestamp):
        self.timestamp = int(datetime.fromisoformat(timestamp).timestamp())

    @contextlib.contextmanager
    def prank(self, sender):
        previous = self.sender
        self.sender = sender
        try:
            yield
        finally:
            self.sender = previous

    @contextlib.contextmanager
    def expect_revert(self, text):
        with pytest.raises(Exception, match=re.escape(text)):
            yield

    def mock_llm(self, pattern, answer):
        self.mocks.append((pattern, answer))

    def clear_mocks(self):
        self.mocks.clear()

    def run_validator(self):
        return self.validator()


class Map(dict):
    @classmethod
    def __class_getitem__(cls, _):
        return cls


def address(value):
    if isinstance(value, bytes):
        value = "0x" + value.hex()
    if not isinstance(value, str) or not re.fullmatch(r"0x[a-fA-F0-9]{40}", value):
        raise ValueError("Invalid address")
    return value.lower()


class Contract:
    def __getattr__(self, name):
        if name in ("agreements", "changes"):
            setattr(self, name, Map())
            return getattr(self, name)
        raise AttributeError(name)


@pytest.fixture
def direct_vm():
    return VM()


@pytest.fixture
def direct_alice():
    return "0x" + "a" * 40


@pytest.fixture
def direct_bob():
    return "0x" + "b" * 40


@pytest.fixture
def direct_charlie():
    return "0x" + "c" * 40


@pytest.fixture
def direct_deploy(direct_vm, monkeypatch):
    def deploy(path):
        fake = types.ModuleType("genlayer")
        fake.gl = types.SimpleNamespace()
        fake.gl.Contract = Contract
        fake.gl.contract = types.SimpleNamespace(Contract=Contract)
        fake.gl.storage = types.SimpleNamespace(TreeMap=Map, allow=lambda cls: cls)
        fake.gl.public = types.SimpleNamespace(write=lambda fn: fn, view=lambda fn: fn)
        class Message:
            @property
            def sender_address(self):
                return address(direct_vm.sender)

        fake.gl.message = Message()

        class Return:
            def __init__(self, calldata):
                self.calldata = calldata

        def run_nondet(classify, validate):
            result = classify()
            direct_vm.validator = lambda: validate(Return(result))
            return result

        def exec_prompt(prompt):
            for pattern, answer in reversed(direct_vm.mocks):
                if re.search(pattern, prompt):
                    return answer
            raise RuntimeError("Missing LLM mock")

        fake.gl.vm = types.SimpleNamespace(Return=Return, run_nondet=run_nondet)
        fake.gl.nondet = types.SimpleNamespace(exec_prompt=exec_prompt)
        fake.contract = fake.gl.contract
        fake.storage = fake.gl.storage
        fake.public = fake.gl.public
        fake.message = fake.gl.message
        fake.vm = fake.gl.vm
        fake.nondet = fake.gl.nondet
        fake.allow_storage = lambda cls: cls
        fake.Address = address
        fake.TreeMap = Map
        fake.u256 = int
        types_module = types.ModuleType("genlayer.types")
        types_module.allow_storage = fake.allow_storage
        types_module.Address = address
        types_module.u256 = int
        types_module.__all__ = ["allow_storage", "Address", "u256"]
        monkeypatch.setitem(sys.modules, "genlayer.types", types_module)
        monkeypatch.setitem(sys.modules, "genlayer", fake)
        spec = importlib.util.spec_from_file_location("contract_under_test", path)
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, spec.name, module)
        spec.loader.exec_module(module)
        module.now = lambda: direct_vm.timestamp
        return module.CovenantFlow()
    return deploy
