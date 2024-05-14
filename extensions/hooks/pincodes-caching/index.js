// @ts-nocheck
const axios = require('axios')

module.exports = function registerHook({ filter }, { env,getSchema, services }) {
    const { ItemsService } = services

    const collectionNames = [
        'cibil_serviceable_pincodes',
        'pincodes',
        'Finacle_pincode_master'
    ]

  async function removePincodeFromCaching(collectionName, pincode) {
        await axios.post(env.CACHE_CLEARING_ENDPOINT,
            {
                collectionName,
                pincode
            }
          )
    }

    filter('Pincodes_servicability.items.update', async (payload, {collection, keys}) => {
        if(keys?.length == 1) {
            const pincodeCollection = new ItemsService(collection, { schema: await getSchema() });
            const currentRow = await pincodeCollection.readByQuery({
                filter: { id: { _eq: keys[0] } },
            });
            await removePincodeFromCaching(collection, currentRow[0]?.pin_code || currentRow[0]?.pincode)
            await removePincodeFromCaching(`${collection}_fkyc`, currentRow[0]?.pin_code || currentRow[0]?.pincode)
        } else {
            await removePincodeFromCaching(collection)
            await removePincodeFromCaching(`${collection}_fkyc`)
        }
    })

    collectionNames.forEach((collectionName) => {
        filter(`${collectionName}.items.update`, async (payload, {collection, keys}) => {
            if(keys?.length == 1) {
                const pincodeCollection = new ItemsService(collection, { schema: await getSchema() });
                const currentRow = await pincodeCollection.readByQuery({
                    filter: { id: { _eq: keys[0] } },
                });
                await removePincodeFromCaching(collection, currentRow[0]?.pin_code || currentRow[0]?.pincode)
            } else {
                await removePincodeFromCaching(collection)
            }
        })
    })
}
