import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
    size?: number;
    className?: string;
    color?: string;
    text?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
    size = 20,
    className = '',
    color = 'text-white',
    text
}) => {
    return (
        <span className={`flex items-center justify-center ${className}`}>
            <Loader2 size={size} className={`animate-spin ${text ? 'mr-3' : ''} ${color}`} />
            {text && <span>{text}</span>}
        </span>
    );
};

export default Spinner;
