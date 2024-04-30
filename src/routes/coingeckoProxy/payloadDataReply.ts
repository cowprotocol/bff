// import { FastifyPluginAsync } from "fastify";

// const plugin: FastifyPluginAsync = async (fastify): Promise<void> => {
//   fastify.decorateReply("payloadData", null);

//   fastify.addHook("onSend", function (req, reply, payload) {
//     fastify.log.info("onSend:payloadData");
//     fastify.payloadData = payload;
//     fastify.log.info("onSend:payloadData");
//   });
// };

// declare module "fastify" {
//   export interface FastifyInstance {
//     /**
//      * `payload` is only populated after `onSend` hook
//      * To be consumed inside `onRequest` hook
//      */
//     payloadData?: unknown;
//   }
// }

// export default plugin;
