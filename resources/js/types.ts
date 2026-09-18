export type Source = {
    title: string;
    document_id: number;
    position: number;
    distance: number;
    excerpt: string;
};

export type Message = {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
    questionId?: number;
    feedback?: 0 | 1;
};

export type Document = {
    id: number;
    title: string;
    source_url?: string | null;
    indexing_status?: string;
    created_at: string;
};

export type ReviewQuestion = {
    id: number;
    question: string;
    answer?: string | null;
    feedback?: string | null;
};

export type StreamEvent =
    | { type: 'token'; content: string }
    | { type: 'answer'; content: string }
    | { type: 'done'; question_id: number; sources: Source[] };
