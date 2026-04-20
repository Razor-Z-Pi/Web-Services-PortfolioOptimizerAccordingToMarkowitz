from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from optimizer import MarkowitzOptimizer
import numpy as np

app = FastAPI(title="Markowitz Portfolio Optimizer")

# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PortfolioInput(BaseModel):
    expected_returns: List[float]
    cov_matrix: List[List[float]]
    asset_names: List[str] = None

class OptimizationResponse(BaseModel):
    max_sharpe: dict
    min_risk: dict
    efficient_frontier: List[dict]

@app.post("/optimize", response_model=OptimizationResponse)
async def optimize_portfolio(data: PortfolioInput):
    """Оптимизация портфеля по Марковицу"""
    try:
        # Валидация
        if len(data.expected_returns) != len(data.cov_matrix):
            raise HTTPException(status_code=400, detail="Размерность матриц не совпадает")
        
        # Оптимизатор
        optimizer = MarkowitzOptimizer(
            data.expected_returns,
            data.cov_matrix
        )
        
        # Оптимизации
        max_sharpe = optimizer.optimize_max_sharpe()
        min_risk = optimizer.optimize_min_risk()
        frontier = optimizer.efficient_frontier(points=30)
        
        # Добавляем имена активов если есть
        if data.asset_names:
            max_sharpe['asset_names'] = data.asset_names
            min_risk['asset_names'] = data.asset_names
        
        return OptimizationResponse(
            max_sharpe=max_sharpe,
            min_risk=min_risk,
            efficient_frontier=frontier
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)