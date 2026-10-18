/**
 * One response envelope for the whole API so the client never has to guess:
 *   { success: true, message?, data?, meta? }
 *   { success: false, message, details? }
 */

export function sendData(res, data, { status = 200, message, meta } = {}) {
  const body = { success: true };
  if (message) body.message = message;
  body.data = data;
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export function sendCreated(res, data, message = 'Created successfully') {
  return sendData(res, data, { status: 201, message });
}

export function sendMessage(res, message, data = null) {
  return sendData(res, data, { message });
}

export function sendPaginated(res, items, meta) {
  return res.status(200).json({ success: true, data: items, meta });
}

export default { sendData, sendCreated, sendMessage, sendPaginated };
