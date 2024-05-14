// @ts-nocheck


module.exports = function registerHook({ filter }, { services, getSchema, exceptions }) {
    const { InvalidPayloadException } = exceptions;
    const { ItemsService } = services

    function validateWorkingHour(payload) {
        if (Boolean(payload.fromTime >= payload.toTime))
            throw new InvalidPayloadException(`"To time" should be greater than "From time"`);
        else return payload
    }

    filter('vkycWorkingHours_review.items.create', async (payload) => {
        return validateWorkingHour(payload);
    })

    filter('vkycWorkingHours_review.items.update', async (payload, collection) => {
        const vkycWorkingHoursService = new ItemsService('vkycWorkingHours_review', { schema: await getSchema() });
        const currentRow = await vkycWorkingHoursService.readByQuery({
            filter: { id: { _eq: collection.keys[0] } },
        });
        validateWorkingHour({ ...currentRow[0], ...payload });
    })
}
