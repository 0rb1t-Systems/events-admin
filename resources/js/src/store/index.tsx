import { combineReducers, configureStore } from '@reduxjs/toolkit';
import themeConfigSlice from './themeConfigSlice';
import authReducer from './authSlice';
import organizationReducer from './organizationSlice';

const rootReducer = combineReducers({
    themeConfig: themeConfigSlice,
    auth: authReducer,
    organization: organizationReducer,
});

const store = configureStore({
    reducer: rootReducer,
});

export default store;
export type IRootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
