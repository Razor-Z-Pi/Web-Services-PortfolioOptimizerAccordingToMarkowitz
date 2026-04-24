import numpy as np
from scipy.optimize import minimize

class MarkowitzOptimizer:
    def __init__(self, expected_returns, cov_matrix):
        self.returns = np.array(expected_returns)  # Ожидаемая годовая доходность
        self.cov = np.array(cov_matrix)  # Годовая ковариация
        self.n_assets = len(expected_returns)
    
    def portfolio_performance(self, weights):
        """Рассчет доходности и риска портфеля"""
        returns = np.sum(self.returns * weights)  # Годовая доходность
        risk = np.sqrt(np.dot(weights.T, np.dot(self.cov, weights)))  # Годовой риск
        return returns, risk
    
    def negative_sharpe(self, weights):
        """Минус Sharpe Ratio для максимизации"""
        returns, risk = self.portfolio_performance(weights)
        return -returns / risk if risk != 0 else -np.inf
    
    def optimize_max_sharpe(self):
        """Оптимизация портфеля с максимальным Sharpe Ratio"""
        constraints = {'type': 'eq', 'fun': lambda x: np.sum(x) - 1}
        bounds = tuple((0, 1) for _ in range(self.n_assets))
        initial_guess = np.array([1/self.n_assets] * self.n_assets)
        
        result = minimize(
            self.negative_sharpe,
            initial_guess,
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )
        
        returns, risk = self.portfolio_performance(result.x)
        return {
            'weights': result.x.tolist(),
            'returns': float(returns),
            'risk': float(risk),
            'sharpe': float(returns / risk) if risk != 0 else 0
        }
    
    def optimize_min_risk(self):
        """Оптимизация портфеля с минимальным риском"""
        constraints = {'type': 'eq', 'fun': lambda x: np.sum(x) - 1}
        bounds = tuple((0, 1) for _ in range(self.n_assets))
        initial_guess = np.array([1/self.n_assets] * self.n_assets)
        
        result = minimize(
            lambda x: self.portfolio_performance(x)[1],
            initial_guess,
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )
        
        returns, risk = self.portfolio_performance(result.x)
        return {
            'weights': result.x.tolist(),
            'returns': float(returns),
            'risk': float(risk),
            'sharpe': float(returns / risk) if risk != 0 else 0
        }
    
    def efficient_frontier(self, points=50):
        """Расчет эффективной границы Марковица"""
        frontiers = []
        
        # Находим диапазон доходностей между min_risk и max_return
        min_risk_port = self.optimize_min_risk()
        max_return_idx = np.argmax(self.returns)
        max_return_weights = np.zeros(self.n_assets)
        max_return_weights[max_return_idx] = 1
        
        min_ret = min_risk_port['returns']
        max_ret = self.portfolio_performance(max_return_weights)[0]
        
        target_returns = np.linspace(min_ret, max_ret, points)
        
        for target in target_returns:
            constraints = [
                {'type': 'eq', 'fun': lambda x: np.sum(x) - 1},
                {'type': 'eq', 'fun': lambda x: np.sum(x * self.returns) * 252 - target}
            ]
            bounds = tuple((0, 1) for _ in range(self.n_assets))
            initial_guess = np.array([1/self.n_assets] * self.n_assets)
            
            result = minimize(
                lambda x: self.portfolio_performance(x)[1],
                initial_guess,
                method='SLSQP',
                bounds=bounds,
                constraints=constraints
            )
            
            if result.success:
                _, risk = self.portfolio_performance(result.x)
                frontiers.append({'risk': float(risk), 'returns': float(target)})
        
        return frontiers