function registerHook({ action }, { services, getSchema, logger }) {
  const { ItemsService } = services;

  action(
    'name_match_review.items.update',
    async ({ collection, payload, keys }) => {
      const schema = await getSchema();
      const nameMatchReviewCollection = new ItemsService(collection, {
        schema,
      });

      try {
        const existingRows = await nameMatchReviewCollection.readMany(keys);

        if (payload.final_decision) {
          const maker_user = existingRows[0]?.user_updated;
          const maker_timestamp = existingRows[0]?.date_updated;

          await nameMatchReviewCollection.updateOne(keys, {
            maker_user,
            maker_timestamp
          });
        } else if (payload.status) {
          const checker_user = existingRows[0]?.user_updated;
          const checker_timestamp = existingRows[0]?.date_updated;

          await nameMatchReviewCollection.updateOne(keys, {
            checker_user,
            checker_timestamp
          });
        }
      } catch (error) {
        logger.error('Error updating rows in name-match-review');
        logger.error(error);
      }
    }
  );
}

module.exports = registerHook;
