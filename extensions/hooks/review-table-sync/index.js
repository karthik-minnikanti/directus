// @ts-nocheck
/* eslint-disable no-prototype-builtins */

const systemFields = new Set(['sort', 'date_created', 'date_updated', 'user_created', 'user_updated']);

const reviewTableRegex = new RegExp(/_review$/);
const reviewFileTableRegex = new RegExp(/_files$/);

function registerHook({ action }, { services, getSchema, logger }) {
	const { ItemsService, CollectionsService } = services;

	action('items.update', async ({ collection, action, payload, keys: item }) => {
		const isReviewCollection = reviewTableRegex.test(collection);
		const isReviewFileCollection = reviewFileTableRegex.test(collection);
		const schema = await getSchema();
		const collectionService = new CollectionsService({ schema });

		if (isReviewFileCollection && payload.status === 'approved') {
			const reviewCollection = collection.replace(reviewFileTableRegex, '') + '_review';
			const fileId = item[0]; // TODO: loop it over rather than using the 0th index so it supports the multi updates as well
			const reviewCollectionService = new ItemsService(reviewCollection, { schema });

			const query = {
				filter: {
					_and: [
						{
							file_id: {
								_eq: fileId,
							},
						}
					],
				},
			};

			await reviewCollectionService.updateByQuery(query, { status: 'accept' });
		}

		if (isReviewCollection && payload.status === 'accept') {
			const reviewCollection = collection;
			const productionCollection = collection.replace(reviewTableRegex, '');
			logger.info(`Maker approved rows in ${reviewCollection}, pushing to ${productionCollection} table`);

			try {
				await collectionService.readOne(productionCollection);
			} catch (err) {
				logger.error(`Error accessing collection ${productionCollection}`);
				logger.error(err);
			}

			const productionCollectionService = new ItemsService(productionCollection, {
				schema,
			});
			const reviewCollectionService = new ItemsService(reviewCollection, {
				schema,
			});
			// fetch current row from 'pin_codes' table
			// override current row with new
			// update row in pin_codes table
			const currentReviewRows = await reviewCollectionService.readMany(item);
			const currentProductionRows = await productionCollectionService.readMany(item);

			const productionRowIdToObjectMap = {};
			currentProductionRows.map((productionRow) => {
				productionRowIdToObjectMap[productionRow.id] = productionRow;
			});

			let productionRowsToCreate = [];
			let productionRowsToUpdate = [];

			currentReviewRows.forEach((reviewRow) => {
				const mappedReviewRows = {};
				Object.keys(reviewRow).forEach((field) => {
					if (!systemFields.has(field)) {
						mappedReviewRows[field] = reviewRow[field];
					}
				});
				mappedReviewRows['review_id'] = reviewRow.id;
				mappedReviewRows['approved_by'] = reviewRow.user_updated;
				mappedReviewRows['date_approved'] = reviewRow.date_updated;
				if (reviewRow.id in productionRowIdToObjectMap) {
					productionRowsToUpdate.push(mappedReviewRows);
				} else {
					productionRowsToCreate.push(mappedReviewRows);
				}
			});

			if (productionRowsToCreate.length > 0) {
				try {
					const insertResult = await productionCollectionService.createMany(productionRowsToCreate);
					logger.info(`Successfully inserted ${insertResult.length} rows into ${productionCollection}`);
				} catch (err) {
					logger.error(`Error creating new rows into ${productionCollection}`);
					logger.error(err);
				}
			}

			if (productionRowsToUpdate.length > 0) {
				const updatesPromises = productionRowsToUpdate.map((productionRowToUpdate) => {
					return productionCollectionService.updateOne(productionRowToUpdate.id, productionRowToUpdate);
				});

				try {
					const updatesResult = await Promise.all(updatesPromises);
					logger.info(`Successfully updated ${updatesResult.length} rows into ${productionCollection}`);
				} catch (err) {
					logger.error(`Error updating rows in ${productionCollection}`);
					logger.error(err);
				}
			}
		}
	})
}

module.exports = registerHook;
