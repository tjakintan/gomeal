export interface WalmartProduct {
    itemId: number;
    name: string;
    salePrice: number;
    largeImage?: string;
    productTrackingUrl?: string;
    stock?: string;

    categoryPath?: string;
    shortDescription?: string;
    longDescription?: string;
    size?: string;
    customerRating?: string;
    numReviews?: number;
    productUrl?: string;
    standardShipRate?: number;
    marketplace?: boolean;
    sellerInfo?: string;
    shipToStore?: boolean;
    freeShipToStore?: boolean;
    availableOnline?: boolean;
    modelNumber?: string;
    upc?: string;
    brandName?: string;
    thumbnailImage?: string;
    mediumImage?: string;

    // Some Walmart responses may include unit-ish pricing fields depending on API/source.
    unitPrice?: number;
    unitPriceDisplayCondition?: string;
    pricePerUnit?: number;
    pricePerUnitUom?: string;
    unit?: string;
}
