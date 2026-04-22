/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @Author Cristian Orrego
 * @description Envía un email relacionado a una transacción específica en NetSuite.
 */
define(['N/email', 'N/file', 'N/record', 'N/runtime', 'N/log'], (email, file, record, runtime, log) => {

  const post = (request) => {
    const {
      transactionId,
      author,
      recipients,
      subject,
      body,
      fileIds = []
    } = request || {};

    if (!transactionId) throw new Error('transactionId is required');
    if (!recipients) throw new Error('recipients is required');
    if (!subject) throw new Error('subject is required');
    if (!body) throw new Error('body is required');

    // author: puede ser un empleado interno o -5 (default) si aplica en tu cuenta/escenario
    const authorId = author;

    const attachments = (fileIds || [])
      .filter(Boolean)
      .map((id) => file.load({ id: Number(id) }));

    // email.send options: author, recipients, subject, body, attachments, relatedRecords
    // relatedRecords.transactionId adjunta el Message a la transacción. :contentReference[oaicite:2]{index=2}
    log.debug('Recipients:', recipients);
    log.debug('Sending email', { authorId, recipients, subject, transactionId, attachmentsCount: attachments.length });
    email.send({
      author: Number(authorId),
      recipients,
      subject,
      body,
      attachments,
      relatedRecords: {
        transactionId: Number(transactionId)
      }
    });
    const now = new Date();
    log.debug('Updating last expediting date on transaction', { transactionId, now });
    record.submitFields({
        type: record.Type.PURCHASE_ORDER,
        id: Number(transactionId),
        values: {
          ['custbody_evol_last_expediting_date']: now   // Para DATE/DATETIME, NetSuite espera un Date
        },
        options: {
          enableSourcing: false,
          ignoreMandatoryFields: true
        }
      });

    return {
      ok: true,
      attachedToTransactionId: Number(transactionId),
      attachmentsCount: attachments.length
    };
  };

  return { post };
});
