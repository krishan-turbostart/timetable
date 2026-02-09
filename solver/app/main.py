from fastapi import FastAPI
from .models import SolveRequest, SolveResponse
from .engine.solver import solve

app = FastAPI(title="Timetable Solver", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/solve", response_model=SolveResponse)
def solve_endpoint(req: SolveRequest):
    return solve(req)
