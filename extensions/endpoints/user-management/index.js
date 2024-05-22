// @ts-nocheck
module.exports = async function(router, {services, exceptions, getSchema, env}){
    const { ItemsService, CollectionsService } = services;
    const schema = await getSchema();
    const collectionService = new CollectionsService({ schema })
    const knex = collectionService.knex;

    const currentDate = new Date();
    const noOfDays =  env.MAX_DAYS_TO_SUSPEND_USERS ? env.MAX_DAYS_TO_SUSPEND_USERS : 60;
    const dateSixtyDaysAgo = currentDate - (noOfDays * 24 * 60 * 60 * 1000);
    const newDate = new Date(dateSixtyDaysAgo);
    const isoDate = new Date(newDate).toISOString();

    router.post('/suspend-users', async(req,res,next) => {
        try{
            console.log("In suspend users")
            const getQuery = "SELECT * FROM directus_users WHERE status = 'active' AND last_access <= '" + isoDate +"'";
            let accountsToBeSuspended= await knex.raw(getQuery);
            console.log(" All users - " + accountsToBeSuspended)

            if(accountsToBeSuspended.rows.length > 0){
                console.log("in condition")

                const allowedEmails = env.ADMIN_EMAILS.split(",");

                accountsToBeSuspended.rows.forEach( async(u) => {
                    if(!allowedEmails.includes(u.email)){
                        try{
                            const updateQuery = "UPDATE directus_users SET status = 'suspended' WHERE id = '" + u.id+"'";
                            let response = await knex.raw(updateQuery);
                            console.log(response.first_name + " " + response.last_name +" was suspended")
                        }catch(error){
                            console.log("Error occuered " + error + u)
                        }
                    }
                })
            }
            return res.json({deletedUsers : accountsToBeSuspended})
        } catch(error){
            console.error("Error suspending users", error);
        }
     })
}
