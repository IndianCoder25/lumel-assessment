import { Request, Response } from "express"
import { db } from '../db/db'
import fs from 'fs'
import * as csv from 'fast-csv'

export const bulkPost = async (req: Request, res: Response) => {
    const BATCH_SIZE = 2000
    let batch: any[] = [];

    async function upsertLookups(rows: any[]) {
        const uniqueRegions = [...new Set(rows.map(r => r.region))];
        const uniqueCategories = [...new Set(rows.map(r => r.category))];
        const uniqueCustomers = [...new Map(rows.map(r => [r.customer_id, r])).values()];
        const uniqueProducts = [...new Map(rows.map(r => [r.product_id, r])).values()];

        // Insert regions
        await db('regions')
            .insert(uniqueRegions.map(name => ({ region_name: name })))
            .onConflict('region_name')
            .ignore();

        // Insert categories
        await db('categories')
            .insert(uniqueCategories.map(name => ({ category_name: name })))
            .onConflict('category_name')
            .ignore();

        // Insert/update customers
        await db('customers')
            .insert(uniqueCustomers.map(c => ({
                customer_id: c.customer_id,
                customer_name: c.customer_name,
                customer_email: c.customer_email,
                customer_address: c.customer_address
            })))
            .onConflict('customer_id')
            .merge(['customer_name', 'customer_email', 'customer_address']);

        // Insert/update products
        const categoryIds = Object.fromEntries(await db('categories').select('category_id', 'category_name')
            .then(res => res.map(r => [r.category_name, r.category_id])));
        await db('products')
            .insert(uniqueProducts.map(p => ({
                product_id: p.product_id,
                product_name: p.product_name,
                category_id: categoryIds[p.category]
            })))
            .onConflict('product_id')
            .merge(['product_name', 'category_id']);
    }

    async function upsertOrdersAndItems(rows: any[]) {
        const regionIds = Object.fromEntries(await db('regions').select('region_id', 'region_name')
            .then(res => res.map(r => [r.region_name, r.region_id])));

        const orders = new Map<string, any>();
        const orderItems: any[] = [];

        for (const r of rows) {
            if (!orders.has(r.order_id)) {
                orders.set(r.order_id, {
                    order_id: r.order_id,
                    customer_id: r.customer_id,
                    region_id: regionIds[r.region],
                    date_of_sell: new Date(r.date_of_sell),
                    shipping_cost: parseFloat(r.shipping_cost),
                    payment_method: r.payment_method
                });
            }

            orderItems.push({
                order_id: r.order_id,
                product_id: r.product_id,
                quantity_sold: parseInt(r.quantity_sold),
                unit_price: parseFloat(r.unit_price),
                discount: parseFloat(r.discount)
            });
        }

        // Insert/update orders
        await db('orders')
            .insert([...orders.values()])
            .onConflict('order_id')
            .merge({
                customer_id: db.raw('VALUES(customer_id)'),
                region_id: db.raw('VALUES(region_id)'),
                date_of_sell: db.raw('VALUES(date_of_sell)'),
                shipping_cost: db.raw('VALUES(shipping_cost)'),
                payment_method: db.raw('VALUES(payment_method)')
            });

        // Insert/update order_items
        for (const item of orderItems) {
            await db('order_items')
                .insert(item)
                .onConflict(['order_id', 'product_id'])
                .merge(['quantity_sold', 'unit_price', 'discount']);
        }
    }

    async function processBatch(rows: any[]) {
        console.log(rows);

        if (rows.length === 0) return;

        try {
            await db.transaction(async trx => {
                await upsertLookups(rows);
                await upsertOrdersAndItems(rows);
            });
            console.log(`Processed batch of ${rows.length} rows`);
        } catch (err) {
            console.error('Failed to process batch:', err);
        }
    }

    if (!req.file?.path) {
        return res.status(400).json({ msg: "File path is missing" });
    }
    const stream = fs.createReadStream(req.file.path).pipe(csv.parse({ headers: true }));

    for await (const row of stream) {
        batch.push({
            "order_id": row['Order ID'],
            "product_id": row['Product ID'],
            "product_name": row['Product Name'],
            "category": row['Category'],
            "region": row['Region'],
            "date_of_sell": row['Date of Sale'],
            "quantity_sold": row['Quantity Sold'],
            "unit_price": row['Unit Price'],
            "discount": row['Discount'],
            "shipping_cost": row['Shipping Cost'],
            "payment_method": row['Payment Mathod'],
            "customer_id": row['Customer ID'],
            "customer_name": row['Customer Name'],
            "customer_email": row['Customer Email'],
            "customer_address": row['Customer Address']
        });
        if (batch.length >= BATCH_SIZE) {
            const toProcess = batch;
            batch = [];
            await processBatch(toProcess);
        }
    }

    if (batch.length > 0) {
        await processBatch(batch);
    }

    console.log('✅ All rows processed.');
    await db.destroy();
    res.json({
        "msg": "user created",
        "data": "data loaded in the DB"
    }).status(201)

    // let batch: any[] = []

    // let customers: any[] = []
    // let regions: any[] = []
    // let categories: any[] = []
    // let products: any[] = []
    // let orders: any[] = []
    // let order_items: any[] = []


    // let recordCounter = 1
    // const BATCH_SIZE = 2000

    // if (!req.file?.path) {
    //     return res.status(400).json({ msg: "File path is missing" });
    // }

    // const regionIds = Object.fromEntries(
    //     await db('regions').select('region_id', 'region_name')
    //         .then(res => res.map(r => [r.region_name, r.region_id])));


    // const categoryIds = Object.fromEntries(await db('categories').select('category_id', 'category_name')
    //     .then(res => res.map(r => [r.category_name, r.category_id])));


    // fs.createReadStream(req.file.path)
    //     .pipe(csv.parse({ headers: true }))
    //     .on("data", async (row) => {

    //         // geting the data
    //         const {
    //             order_id, product_id, product_name, category, region,
    //             date_of_sell, quantity_sold, unit_price, discount, shipping_cost, payment_method,
    //             customer_id, customer_name, customer_email, customer_address
    //         } = row;


    //         customers.push({
    //             customer_id: customer_id,
    //             customer_name: customer_name,
    //             customer_email: customer_email,
    //             customer_address: customer_address
    //         })

    //         regions.push({
    //             region_name: region
    //         })

    //         categories.push({
    //             category_name: category
    //         })

    //         products.push({
    //             product_id: product_id,
    //             product_name: product_name,
    //             category_id: categories[category]
    //         })

    //         orders.push({
    //             order_id : order_id,
    //             customer_id: customer_id,
    //             region_id: regionIds[region],
    //             date_of_sell: date_of_sell,
    //             shipping_cost: parseFloat(shipping_cost),
    //             payment_method: payment_method
    //         })

    //         order_items.push({
    //             order_id: order_id,
    //             product_id: product_id,
    //             quantity_sold: parseInt(quantity_sold),
    //             unit_price: parseFloat(unit_price),
    //             discount: parseFloat(discount)
    //         })


    //         if (batch.length >= BATCH_SIZE) {
    //             const currentBatch = batch
    //             batch = []


    //             const values = currentBatch.map(user => [user.id, user.name, user.email, user.age])

    //             await db.raw(`
    //             INSERT INTO users (id, name, email, age)
    //             VALUES ?
    //             ON DUPLICATE KEY UPDATE
    //                 name = IF(name != VALUES(name), VALUES(name), name),
    //                 email = IF(email != VALUES(email), VALUES(email), email),
    //                 age = IF(age != VALUES(age), VALUES(age), age)
    //             `, [values])
    //             // await db('users').insert(currentBatch).onConflict('id').merge(['name', 'email', 'age'])
    //         }
    //     })
    //     .on("end", async () => {
    //         if (batch.length >= BATCH_SIZE) {
    //             const currentBatch = batch
    //             batch = []

    //             const values = currentBatch.map(user => [user.id, user.name, user.email, user.age])

    //             await db.raw(`
    //             INSERT INTO users (id, name, email, age)
    //             VALUES ?
    //             ON DUPLICATE KEY UPDATE
    //                 name = IF(name != VALUES(name), VALUES(name), name),
    //                 email = IF(email != VALUES(email), VALUES(email), email),
    //                 age = IF(age != VALUES(age), VALUES(age), age)
    //             `, [values])
    //             // await db('users').insert(currentBatch).onConflict('id').merge(['name', 'email', 'age'])
    //         }
    //     })

    // res.json({
    //     "msg": "user created",
    //     "data": "data loaded in the DB"
    // }).status(201)
}

export const customerAnalytics = async (req: Request, res: Response) => {
    const { from, to } = req.query;
    if (!from || !to) {
        return res.status(400).json({
            "error": "'from' and 'to' query params are required!"
        })
    }

    try {
        const totalOrders = await db('orders').countDistinct('order_id as count').whereBetween('date_of_sell', [from, to]).first()

        const totalCustomers = await db('orders').countDistinct('customer_id as count').whereBetween('date_of_sell', [from, to]).first()

        const totalValueResult = await db('orders')
            .join('order_items', 'orders.order_id', 'order_items.order_id')
            .whereBetween('orders.date_of_sell', [from, to])
            .sum(
                db.raw('(order_items.quantity_sold * order_items.unit_price - order_items.discount)')
            ).as('total')
            .first();


        const totalOrderValue = Number((totalValueResult as any)?.total || 0);
        const orderCount = Number(totalOrders?.count || 0);

        const averageOrderValue = orderCount > 0 ? (totalOrderValue / orderCount) : 0;

        res.json({
            total_customers: totalCustomers?.count || 0,
            total_orders: orderCount,
            average_order_value: averageOrderValue
        });

    } catch (err) {
        console.error('Error in analytics API:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}