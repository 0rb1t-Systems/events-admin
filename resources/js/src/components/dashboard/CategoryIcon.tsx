import React from "react";
import { BookOpen, MessageSquare, Book, Bookmark, Tag } from "lucide-react";

interface CategoryIconProps {
    categoryName: string;
    size?: number;
}

const CategoryIcon: React.FC<CategoryIconProps> = ({
    categoryName,
    size = 24,
}) => {
    // Default icons for common category types
    if (
        categoryName.toLowerCase().includes("poem") ||
        categoryName.toLowerCase().includes("poetry")
    ) {
        return <BookOpen size={size} />;
    } else if (
        categoryName.toLowerCase().includes("wisdom") ||
        categoryName.toLowerCase().includes("quote")
    ) {
        return <MessageSquare size={size} />;
    } else if (
        categoryName.toLowerCase().includes("story") ||
        categoryName.toLowerCase().includes("tales")
    ) {
        return <Book size={size} />;
    } else if (categoryName.toLowerCase().includes("proverb")) {
        return <Bookmark size={size} />;
    } else {
        // Default icon for any other category
        return <Tag size={size} />;
    }
};

export default CategoryIcon;
