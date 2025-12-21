export interface FieldState { value: number; divident?: number }
export interface CalcState { flour: FieldState; water: FieldState; starter: FieldState; hydration: FieldState; totalDough?: FieldState }

export const calculateHydration = (state: CalcState, starterHydration: number) => {
  const sH = starterHydration / 100;
  return (state.water.value + (state.starter.value * (sH / (1 + sH)))) / (state.flour.value + (state.starter.value * (1 / (1 + sH)))) * 100;
}

export const calculateTotalDough = (state: CalcState) => {
  return state.flour.value * 1.02 + state.water.value + state.starter.value;
}

export const calculateFlour = (state: CalcState, starterHydration: number) => {
  const sH = starterHydration / 100;
  const starterFlour = state.starter.value * (1 / (1 + sH));
  const starterWater = state.starter.value * (sH / (1 + sH));
  const H = state.hydration.value / 100;
  return (state.water.value + starterWater - (starterFlour * H)) / H;
}

export const calculateWater = (state: CalcState, starterHydration: number) => {
  const sH = starterHydration / 100;
  const starterFlour = state.starter.value * (1 / (1 + sH));
  const starterWater = state.starter.value * (sH / (1 + sH));
  const H = state.hydration.value / 100;
  return H * state.flour.value + H * starterFlour - starterWater;
}

export const calculateStarter = (state: CalcState, starterHydration: number) => {
  const sH = starterHydration / 100;
  const cFlour = (1 / (1 + sH));
  const cWater = (sH / (1 + sH));
  const H = state.hydration.value / 100;
  return ((H * state.flour.value) - state.water.value) / (cWater - (H * cFlour));
}
