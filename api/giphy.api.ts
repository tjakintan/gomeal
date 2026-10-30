const GIPHY_API_KEY =
    process.env.EXPO_PUBLIC_GIPHY_API_KEY;

const GIPHY_BASE_URL =
    "https://api.giphy.com/v1";


export type GiphyImage = {
    url: string;
    width: string;
    height: string;
    size?: string;
    mp4?: string;
    mp4_size?: string;
    webp?: string;
    webp_size?: string;
};


export type GiphyGif = {
    type: string;
    id: string;
    slug: string;
    url: string;
    title: string;
    username?: string;
    source?: string;
    rating: string;
    images: {
        original: GiphyImage;
        fixed_width: GiphyImage;
        fixed_width_small: GiphyImage;
        fixed_height?: GiphyImage;
        fixed_height_small?: GiphyImage;
        preview_gif?: GiphyImage;
        downsized?: GiphyImage;
        downsized_small?: GiphyImage;
        downsized_medium?: GiphyImage;
        downsized_large?: GiphyImage;
        original_still?: GiphyImage;
    };
};


export type GiphyPagination = {
    total_count: number;
    count: number;
    offset: number;
};


export type GiphyMeta = {
    status: number;
    msg: string;
    response_id?: string;
};


export type GiphyResponse = {
    data: GiphyGif[];
    pagination: GiphyPagination;
    meta: GiphyMeta;
};


export type GiphySubcategory = {
    name: string;
    name_encoded: string;
};


export type GiphyCategory = {
    name: string;
    name_encoded: string;
    subcategories: GiphySubcategory[];
    gif?: GiphyGif;
};


export type GiphyCategoriesResponse = {
    data: GiphyCategory[];
    pagination: GiphyPagination;
    meta: GiphyMeta;
};


export type GiphyTrendingSearchTerm = {
    name: string;
};


export type GiphyTrendingSearchTermsResponse = {
    data: GiphyTrendingSearchTerm[];
    pagination: GiphyPagination;
    meta: GiphyMeta;
};


const giphyFetch = async (
    endpoint: string,
    params: Record<string, string | number | boolean>
) => {

    if (!GIPHY_API_KEY) {
        throw new Error(
            "Missing EXPO_PUBLIC_GIPHY_API_KEY"
        );
    }

    const searchParams =
        new URLSearchParams({
            api_key: GIPHY_API_KEY,
            ...Object.fromEntries(
                Object.entries(params).map(
                    ([key, value]) => [
                        key,
                        String(value),
                    ]
                )
            ),
        });

    const response = await fetch(
        `${GIPHY_BASE_URL}${endpoint}?${searchParams.toString()}`
    );

    if (!response.ok) {
        throw new Error(
            `GIPHY request failed: ${response.status}`
        );
    }

    return response.json();
};


/**
 * Search GIFs.
 */
export const searchGifs = async ({
    query,
    limit = 20,
    offset = 0,
}: {
    query: string;
    limit?: number;
    offset?: number;
}): Promise<GiphyResponse> => {

    return giphyFetch(
        "/gifs/search",
        {
            q: query,
            limit,
            offset,
            rating: "pg-13",
        }
    );
};


/**
 * Get trending GIFs.
 */
export const getTrendingGifs = async ({
    limit = 20,
    offset = 0,
}: {
    limit?: number;
    offset?: number;
} = {}): Promise<GiphyResponse> => {

    return giphyFetch(
        "/gifs/trending",
        {
            limit,
            offset,
            rating: "pg-13",
        }
    );
};


/**
 * Search stickers.
 */
export const searchStickers = async ({
    query,
    limit = 20,
    offset = 0,
}: {
    query: string;
    limit?: number;
    offset?: number;
}): Promise<GiphyResponse> => {

    return giphyFetch(
        "/stickers/search",
        {
            q: query,
            limit,
            offset,
            rating: "pg-13",
        }
    );
};


/**
 * Get trending stickers.
 */
export const getTrendingStickers = async ({
    limit = 20,
    offset = 0,
}: {
    limit?: number;
    offset?: number;
} = {}): Promise<GiphyResponse> => {

    return giphyFetch(
        "/stickers/trending",
        {
            limit,
            offset,
            rating: "pg-13",
        }
    );
};


/**
 * Get GIF categories.
 *
 * Each category can contain:
 * - name
 * - encoded name
 * - subcategories
 * - featured GIF
 */
export const getGiphyCategories =
    async (): Promise<GiphyCategoriesResponse> => {

        return giphyFetch(
            "/gifs/categories",
            {}
        );
    };


/**
 * Get trending search terms.
 *
 * Example results:
 * ["reaction", "funny", "love", ...]
 */
export const getTrendingSearchTerms =
    async (): Promise<GiphyTrendingSearchTermsResponse> => {

        return giphyFetch(
            "/trending/search/terms",
            {}
        );
    };


const MEME_API_BASE_URL =
    "https://justmeme.wtf/api/v1";


export type MemeCategory =
    | "reaction"
    | "comparison"
    | "approval"
    | "animal"
    | "cartoon"
    | "movie"
    | "expanding"
    | "relatable"
    | "wholesome"
    | "dark"
    | "workplace"
    | "relationship"
    | "gaming"
    | "classic"
    | "trending"
    | "label"
    | "two-panel"
    | "four-panel"
    | "multi-panel"
    | "drake-format";


export type MemeCategoryItem = {
    slug: MemeCategory;
    name: string;
};


export const MEME_CATEGORIES: MemeCategoryItem[] = [
    {
        slug: "reaction",
        name: "Reaction",
    },
    {
        slug: "comparison",
        name: "Comparison",
    },
    {
        slug: "approval",
        name: "Approval & Disapproval",
    },
    {
        slug: "animal",
        name: "Animal",
    },
    {
        slug: "cartoon",
        name: "Cartoon & Anime",
    },
    {
        slug: "movie",
        name: "Movie & TV",
    },
    {
        slug: "expanding",
        name: "Expanding & Multi-Panel",
    },
    {
        slug: "relatable",
        name: "Relatable",
    },
    {
        slug: "wholesome",
        name: "Wholesome",
    },
    {
        slug: "dark",
        name: "Dark Humor",
    },
    {
        slug: "workplace",
        name: "Workplace & Office",
    },
    {
        slug: "relationship",
        name: "Relationship",
    },
    {
        slug: "gaming",
        name: "Gaming",
    },
    {
        slug: "classic",
        name: "Classic",
    },
    {
        slug: "trending",
        name: "Trending",
    },
    {
        slug: "label",
        name: "Label",
    },
    {
        slug: "two-panel",
        name: "Two Panel",
    },
    {
        slug: "four-panel",
        name: "Four Panel",
    },
    {
        slug: "multi-panel",
        name: "Multi Panel",
    },
    {
        slug: "drake-format",
        name: "Drake Format",
    },
];


export type Meme = {
    id: string;
    name: string;
    slug: string;
    url: string;
    categories: MemeCategory[];
};


export type MemeResponse = {
    success: boolean;
    templates: Meme[];
    total: number;
    page: number;
    limit: number;
};


export type MemeCategoriesResponse = {
    success: boolean;
    categories: {
        slug: MemeCategory;
        name: string;
        count: number;
    }[];
};


const memeFetch = async (
    endpoint: string,
    params?: Record<string, string | number>
) => {

    const searchParams = new URLSearchParams();

    if (params) {
        Object.entries(params).forEach(
            ([key, value]) => {
                searchParams.append(
                    key,
                    String(value)
                );
            }
        );
    }

    const query =
        searchParams.toString();

    const response = await fetch(
        `${MEME_API_BASE_URL}${endpoint}${
            query ? `?${query}` : ""
        }`
    );

    if (!response.ok) {
        throw new Error(
            `Meme API request failed: ${response.status}`
        );
    }

    return response.json();
};


/**
 * Get meme templates.
 *
 * Optional category filtering.
 */
export const getMemes = async ({
    page = 1,
    limit = 20,
    category,
}: {
    page?: number;
    limit?: number;
    category?: MemeCategory;
} = {}): Promise<MemeResponse> => {

    return memeFetch(
        "/templates",
        {
            page,
            limit,
            ...(category
                ? {
                    category,
                }
                : {}),
        }
    );
};


/**
 * Search meme templates.
 */
export const searchMemes = async (
    query: string
): Promise<MemeResponse> => {

    return memeFetch(
        "/templates/search",
        {
            q: query,
        }
    );
};


/**
 * Get trending meme templates.
 */
export const getTrendingMemes =
    async (): Promise<Meme[]> => {

        const response =
            await memeFetch("/trending");

        return response.trending;
    };


/**
 * Get all meme categories.
 */
export const getMemeCategories =
    async (): Promise<MemeCategoriesResponse> => {

        return memeFetch("/categories");
    };