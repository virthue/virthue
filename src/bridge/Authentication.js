import User from './User.js';

/*
* @Docs https://developers.meethue.com/develop/hue-api/7-configuration-api/
*/
export default class Authentication {
    Bridge = null;
    Users = [];

    constructor(bridge) {
        this.Bridge = bridge;

        let root = this.#createUser('root');
        root.setToken('root');
    }

    async onRequest(request, response) {
        if(!request.body?.devicetype) {
            return response.send([{
                error: {
                    type:           5,
                    address:        '/',
                    description:    'invalid/missing parameters in body'
                }
            }]);
        }

        if(!this.Bridge.getLinkButton().getState()) {
            return response.send([{
                error: {
                    type:           101,
                    address:        '',
                    description:    'link button not pressed'
                }
            }]);
        }

        /*
            @ToDo Nope, here Philips Hue also don't validate the input: {"devicetype":""} can be empty or not including the <application_name>#<devicename> Scheme.
        */

        this.Bridge.getLinkButton().deactivate();

        let user = this.#createUser(request.body?.devicetype);

        if(!user.hasToken()) {
            user.generateToken();
        }

        if(request?.body?.generateclientkey) {
            user.generateClientKey();
        }

        return response.send([{
            success: {
                username: user.getToken(),
                ...(user.hasClientKey() ? {
                    clientkey: user.getClientKey()
                } : null)
            }
        }]);
    }

    async checkAuth(request, reply) {
        const { token } = request.params;

        if(!this.Users.some(user => user.getToken() === token)) {
            return reply.send([{
                error: {
                    type:           1,
                    address:        request.url.replace(`/api/${token}`, ''),
                    description:    'unauthorized user'
                }
            }]);
        }

        this.Users.find(user => user.getToken() === token).DateLastUsed = new Date();
    }

    #createUser(name) {
        const user = new User();

        user.setName(name);

        this.Users.push(user);

        return user;
    }

    toJSON() {
        return this.Users.reduce((users, user) => {
            users[user.getToken()] = user.toJSON();

            return users;
        }, {});
    }
}