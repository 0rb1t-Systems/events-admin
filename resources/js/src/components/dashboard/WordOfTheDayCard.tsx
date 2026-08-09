import React from 'react';
import { Calendar, BookOpen, ArrowRight, Sparkles } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface WordOfTheDayProps {
    wordOfTheDay: {
        word: {
            id: number;
            word: string;
            description: string;
            category?: {
                id: number;
                name: string;
            };
        };
        featured_at: string;
        next_update: string;
    } | null;
    loading?: boolean;
}

const WordOfTheDayCard: React.FC<WordOfTheDayProps> = ({ wordOfTheDay, loading = false }) => {
    if (loading) {
        return (
            <div className="w-full rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-400 shadow-lg p-8 flex flex-col items-center justify-center min-h-[220px] animate-pulse">
                <div className="flex items-center mb-4">
                    <Sparkles className="w-8 h-8 text-white opacity-60 mr-2" />
                    <h2 className="text-2xl font-bold text-white">Word of the Day</h2>
                </div>
                <div className="h-8 w-1/2 bg-white/30 rounded mb-2"></div>
                <div className="h-4 w-1/3 bg-white/20 rounded"></div>
            </div>
        );
    }

    if (!wordOfTheDay) {
        return (
            <div className="w-full rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-400 shadow-lg p-8 flex flex-col items-center justify-center min-h-[220px]">
                <div className="flex items-center mb-4">
                    <Sparkles className="w-8 h-8 text-white opacity-60 mr-2" />
                    <h2 className="text-2xl font-bold text-white">Word of the Day</h2>
                </div>
                <p className="text-white/80 text-lg">No word of the day available</p>
            </div>
        );
    }

    const { word, featured_at, next_update } = wordOfTheDay;
    const nextUpdateDate = parseISO(next_update);
    const featuredDate = parseISO(featured_at);

    return (
        <div className="w-full rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-400 shadow-lg p-8 flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
            {/* Subtle icon background */}
            <Sparkles className="absolute right-8 top-8 w-20 h-20 text-white opacity-10 pointer-events-none" />
            <div className="flex items-center mb-2 z-10">
                <Calendar className="w-5 h-5 text-white/80 mr-2" />
                <span className="text-white/80 text-sm">Featured {format(featuredDate, 'MMM d, yyyy')}</span>
            </div>
            <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight text-center drop-shadow-lg z-10">{word.word}</h2>
            {word.category && (
                <span className="bg-white/20 px-4 py-1 rounded-full text-xs font-semibold text-white mb-2 z-10">
                    {word.category.name}
                </span>
            )}
            <p className="text-white/90 text-lg text-center mb-4 z-10 max-w-2xl">{word.description}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full z-10">
                <div className="flex items-center text-white/80 text-sm">
                    <BookOpen className="w-4 h-4 mr-1" />
                    <span>Next update: {format(nextUpdateDate, 'MMM d, yyyy')}</span>
                </div>
                <a
                    href={`/dictionary/${word.id}`}
                    className="inline-flex items-center text-white font-semibold hover:underline transition-colors"
                >
                    View details
                    <ArrowRight className="w-4 h-4 ml-1" />
                </a>
            </div>
        </div>
    );
};

export default WordOfTheDayCard;
