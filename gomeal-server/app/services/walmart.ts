import * as crypto from "crypto";
import * as fs from "fs";
import dotenv from "dotenv";
import { WalmartProduct } from "@/types/retail.types";

dotenv.config();

const CONSUMER_ID = process.env.WALMART_CONSUMER_ID!;
const PRIVATE_KEY_PATH = process.env.WALMART_PRIVATE_KEY_PATH!;
const CHANNEL_TYPE = process.env.WALMART_CHANNEL_TYPE;
const KEY_VERSION = process.env.WALMART_KEY_VERSION!;

const FOOD_CATEGORY_ID = "976759";
const DEFAULT_WALMART_STORE_ID = 5294;
const BASE_URL = "https://developer.api.walmart.com/api-proxy/service/affil/product/v2";

const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");

function buildHeaders(): Record<string, string> {
  const timestamp = Date.now().toString();

  // Walmart Affiliate signature string:
  // WM_CONSUMER.ID + WM_CONSUMER.INTIMESTAMP + WM_SEC.KEY_VERSION
  const data = `${CONSUMER_ID}\n${timestamp}\n${KEY_VERSION}\n`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(data, "utf8");
  sign.end();

  const signature = sign.sign(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    "base64"
  );

  const headers: Record<string, string> = {
    "WM_CONSUMER.ID": CONSUMER_ID,
    "WM_CONSUMER.INTIMESTAMP": timestamp,
    "WM_SEC.AUTH_SIGNATURE": signature,
    "WM_SEC.KEY_VERSION": KEY_VERSION,
    "WM_QOS.CORRELATION_ID": crypto.randomUUID(),
    Accept: "application/json",
  };

  if (CHANNEL_TYPE) {
    headers["WM_CONSUMER.CHANNEL.TYPE"] = CHANNEL_TYPE;
  }

  return headers;
};

export async function walmart_product_lookup(
  query: string
): Promise<WalmartProduct[]> {
  const url = `${BASE_URL}/search?query=${encodeURIComponent(
    query
  )}&categoryId=${FOOD_CATEGORY_ID}&storeId=${DEFAULT_WALMART_STORE_ID}&numItems=5&sort=price&order=ascending`;

  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`walmart_lookup_failed: ${res.status} ${body}`);
  }

  const data = await res.json();
console.log("walmart_lookup_items", {
    query,
    items: data?.items?.map((item: WalmartProduct) => ({
        itemId: item.itemId,
        name: item.name,
        salePrice: item.salePrice,
        unitPrice: item.unitPrice,
        pricePerUnit: item.pricePerUnit,
        pricePerUnitUom: item.pricePerUnitUom,
        unit: item.unit,
        size: item.size,
        categoryPath: item.categoryPath,
        stock: item.stock,
    })),
});


  return data?.items ?? [];
}

export default { walmart_product_lookup };
