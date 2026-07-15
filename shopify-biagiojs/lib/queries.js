/**
 * Storefront GraphQL queries used by the server (build + SSR).
 * Cart and login mutations run client-side  see islands/shopify-client.js.
 */
import { storefront } from './shopify.js';

const PRODUCT_CARD = `
  id
  handle
  title
  featuredImage { url altText width height }
  priceRange {
    minVariantPrice { amount currencyCode }
    maxVariantPrice { amount currencyCode }
  }
  variants(first: 1) {
    nodes {
      price { amount currencyCode }
      compareAtPrice { amount currencyCode }
    }
  }
`;

/* ---- Catalog: handles for getStaticPaths ---- */

export async function allProductHandles(limit = 250) {
  const data = await storefront(
    `query($n:Int!){ products(first:$n){ nodes { handle } } }`,
    { n: limit }
  );
  return data.products.nodes.map(n => n.handle);
}

export async function allCollectionHandles(limit = 250) {
  const data = await storefront(
    `query($n:Int!){ collections(first:$n){ nodes { handle } } }`,
    { n: limit }
  );
  return data.collections.nodes.map(n => n.handle);
}

/* ---- Shop all ---- */

export async function allProducts(limit = 100) {
  const data = await storefront(
    `query($n:Int!){ products(first:$n, sortKey:CREATED_AT, reverse:true){ nodes { ${PRODUCT_CARD} } } }`,
    { n: limit }
  );
  return data.products.nodes;
}

/* ---- Home ---- */

export async function featuredProducts(handle, limit = 8) {
  const data = await storefront(
    `query($handle:String!,$n:Int!){
      collection(handle:$handle){
        title
        description
        products(first:$n){ nodes { ${PRODUCT_CARD} } }
      }
    }`,
    { handle, n: limit }
  );
  const col = data.collection;
  if (!col) {
    // Fallback: newest products if the featured collection doesn't exist yet.
    const p = await storefront(
      `query($n:Int!){ products(first:$n, sortKey:CREATED_AT, reverse:true){ nodes { ${PRODUCT_CARD} } } }`,
      { n: limit }
    );
    return { title: 'New arrivals', description: '', products: p.products.nodes };
  }
  return { title: col.title, description: col.description, products: col.products.nodes };
}

/* ---- Product detail ---- */

export async function productByHandle(handle) {
  const data = await storefront(
    `query($handle:String!){
      product(handle:$handle){
        id
        handle
        title
        descriptionHtml
        tags
        vendor
        featuredImage { url altText width height }
        images(first:8){ nodes { url altText width height } }
        priceRange {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
        options { name values }
        variants(first:100){
          nodes {
            id
            title
            availableForSale
            quantityAvailable
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
            selectedOptions { name value }
          }
        }
        seo { title description }
      }
    }`,
    { handle }
  );
  const product = data.product;
  if (product) {
    // quantityAvailable is null when the inventory scope is missing → treat as 0
    for (const v of product.variants.nodes) v.quantityAvailable = v.quantityAvailable ?? 0;
  }
  return product;
}

/* ---- Collection listing ---- */

export async function collectionByHandle(handle, limit = 48) {
  const data = await storefront(
    `query($handle:String!,$n:Int!){
      collection(handle:$handle){
        title
        description
        image { url altText width height }
        products(first:$n){ nodes { ${PRODUCT_CARD} } }
      }
    }`,
    { handle, n: limit }
  );
  return data.collection;
}

export async function collectionsNav(limit = 8) {
  const data = await storefront(
    `query($n:Int!){ collections(first:$n){ nodes { handle title } } }`,
    { n: limit }
  );
  // Collections named "hidden" (in title or handle) are utility collections
  // (e.g. featured pools) — keep them out of the storefront navigation.
  return data.collections.nodes.filter(
    c => !/hidden/i.test(c.title) && !/hidden/i.test(c.handle)
  );
}

/* ---- Customer (private area, SSR with a customer access token) ---- */

export async function customerByToken(accessToken) {
  const data = await storefront(
    `query($token:String!){
      customer(customerAccessToken:$token){
        id
        firstName
        lastName
        email
        phone
        defaultAddress { address1 address2 city province country zip }
        orders(first:20, sortKey:PROCESSED_AT, reverse:true){
          nodes {
            orderNumber
            processedAt
            financialStatus
            fulfillmentStatus
            currentTotalPrice { amount currencyCode }
            lineItems(first:20){ nodes { title quantity } }
          }
        }
      }
    }`,
    { token: accessToken }
  );
  return data.customer;
}
