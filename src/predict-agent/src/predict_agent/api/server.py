"""FastAPI server for predict-agent."""

from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from ..predict_agent import PredictAgent
from ..config import load_predict_config
from agent_framework.core import AgentConfig

app = FastAPI(title="Predict Agent API", version="1.0.0")

# Global agent instance
_agent: Optional[PredictAgent] = None


class CoverageQueryRequest(BaseModel):
    query: str
    topic: Optional[str] = "general"


class SimulationRecommendRequest(BaseModel):
    scenario: str = "urban"
    network_type: str = "5G"


class SimulationTuneRequest(BaseModel):
    current_params: dict
    performance_metrics: dict
    target_metrics: Optional[dict] = None


async def get_agent() -> PredictAgent:
    """Get or create the agent instance."""
    global _agent
    if _agent is None:
        config = load_predict_config()
        coverage_config = config.load_coverage_config()
        simulation_config = config.load_simulation_config()

        # Import tools and skills
        from ..capabilities.tools.coverage_tool import (
            CoveragePredictionTool,
            CoverageSimulationTool
        )
        from ..capabilities.skills.coverage_qa_skill import CoverageQASkill
        from ..capabilities.skills.simulation_tuning_skill import SimulationTuningSkill

        # Create tools
        coverage_tool = CoveragePredictionTool(
            llm_endpoint=coverage_config.get("llm_endpoint"),
            llm_model=coverage_config.get("llm_model"),
            api_key=coverage_config.get("api_key"),
        )

        simulation_tool = CoverageSimulationTool(
            simulation_api_url=simulation_config.get("simulation_api_url"),
        )

        # Create skills
        coverage_qa_skill = CoverageQASkill(
            vectorstore_path=coverage_config.get("vectorstore_path"),
            llm_endpoint=coverage_config.get("llm_endpoint"),
            llm_model=coverage_config.get("llm_model"),
            llm_api_key=coverage_config.get("api_key"),
            llm_method=coverage_config.get("llm_method", "post"),
        )

        simulation_tuning_skill = SimulationTuningSkill(
            llm_endpoint=simulation_config.get("llm_endpoint"),
            llm_model=simulation_config.get("llm_model"),
            llm_api_key=simulation_config.get("api_key"),
            llm_method=simulation_config.get("llm_method", "post"),
        )

        # Create agent
        agent_config = AgentConfig(
            name="PredictAgent",
            description="Coverage Prediction Agent with Q&A and Simulation Tuning capabilities",
        )

        _agent = PredictAgent(
            config=agent_config,
            tools=[coverage_tool, simulation_tool],
            skills=[coverage_qa_skill, simulation_tuning_skill],
            coverage_llm_config=coverage_config,
        )

    return _agent


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "predict-agent"}


@app.get("/capabilities")
async def get_capabilities():
    """Get agent capabilities."""
    agent = await get_agent()
    return agent.get_capabilities()


@app.post("/coverage/query")
async def query_coverage(request: CoverageQueryRequest):
    """
    Query coverage prediction knowledge.

    Args:
        request: CoverageQueryRequest with query and optional topic

    Returns:
        Q&A result with answer and sources
    """
    agent = await get_agent()
    result = await agent.query_coverage_prediction(request.query)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@app.post("/simulation/recommend")
async def recommend_simulation_params(request: SimulationRecommendRequest):
    """
    Recommend simulation parameters for a scenario.

    Args:
        request: SimulationRecommendRequest with scenario and network_type

    Returns:
        Recommended parameters
    """
    agent = await get_agent()
    result = await agent.recommend_simulation_params(
        scenario=request.scenario,
        network_type=request.network_type
    )

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@app.post("/simulation/tune")
async def tune_simulation_params(request: SimulationTuneRequest):
    """
    Tune simulation parameters based on performance metrics.

    Args:
        request: SimulationTuneRequest with current_params, performance_metrics, and target_metrics

    Returns:
        Tuned parameters with suggestions
    """
    agent = await get_agent()
    result = await agent.tune_simulation_params(
        current_params=request.current_params,
        performance_metrics=request.performance_metrics,
        target_metrics=request.target_metrics
    )

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@app.post("/coverage/validate-params")
async def validate_simulation_params(params: dict):
    """
    Validate simulation parameters.

    Args:
        params: Simulation parameters to validate

    Returns:
        Validation result
    """
    from ..capabilities.tools.coverage_tool import CoverageSimulationTool

    tool = CoverageSimulationTool()
    result = await tool.run({"action": "validate", "params": params})

    return result


def run_server(host: str = "0.0.0.0", port: int = 8083):
    """Run the FastAPI server."""
    import uvicorn
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    run_server()
