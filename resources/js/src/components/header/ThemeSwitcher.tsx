import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../store';
import { toggleTheme } from '../../store/themeConfigSlice';
import { Sun, Moon, Laptop } from 'lucide-react';

const ThemeSwitcher = () => {
    const dispatch = useDispatch();
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);

    return (
        <div>
            {themeConfig.theme === 'light' ? (
                <button
                    className={`${
                        themeConfig.theme === 'light' &&
                        'flex items-center p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60'
                    }`}
                    onClick={() => {
                        dispatch(toggleTheme('dark'));
                    }}
                >
                    <Sun size={20} />
                </button>
            ) : (
                ''
            )}
            {themeConfig.theme === 'dark' && (
                <button
                    className={`${
                        themeConfig.theme === 'dark' &&
                        'flex items-center p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60'
                    }`}
                    onClick={() => {
                        dispatch(toggleTheme('system'));
                    }}
                >
                    <Moon size={20} />
                </button>
            )}
            {themeConfig.theme === 'system' && (
                <button
                    className={`${
                        themeConfig.theme === 'system' &&
                        'flex items-center p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60'
                    }`}
                    onClick={() => {
                        dispatch(toggleTheme('light'));
                    }}
                >
                    <Laptop size={20} />
                </button>
            )}
        </div>
    );
};

export default ThemeSwitcher;
