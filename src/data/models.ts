// Products that have a 3D model in public/models (made from the product photo by an image-to-3D tool).
import { asset } from "../lib/asset";
const MODEL_IDS = new Set([1686]);

export const modelOf = (productId: number) => (MODEL_IDS.has(productId) ? asset(`models/${productId}.glb`) : null);
