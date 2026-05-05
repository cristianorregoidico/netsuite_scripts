/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @Author Cristian Orrego
 */
define(['N/email', 'N/file', 'N/record', 'N/runtime', 'N/log', 'N/error'],
(email, file, record, runtime, log, nsError) => {

  const post = (request) => {
    try {
      const {
        transactionId,
        author,
        recipients,
        cc,
        subject,
        body,
        fileIds = []
      } = request || {};

      if (!transactionId) throw nsError.create({ name: 'MISSING_PARAM', message: 'transactionId is required' });
      if (!recipients) throw nsError.create({ name: 'MISSING_PARAM', message: 'recipients is required' });
      
      if (!subject) throw nsError.create({ name: 'MISSING_PARAM', message: 'subject is required' });
      if (!body) throw nsError.create({ name: 'MISSING_PARAM', message: 'body is required' });

      const authorId = author;

      // Cargar adjuntos
      const attachments = (fileIds || [])
        .filter(Boolean)
        .map((id) => file.load({ id: Number(id) }));

      log.debug('Sending email', {
        authorId,
        recipients,
        cc,
        subject,
        transactionId,
        attachmentsCount: attachments.length
      });

      // Enviar email y relacionarlo a la transacción
      const emailOptions = {
        author: Number(authorId),
        recipients,
        subject,
        body,
        attachments,
        relatedRecords: { transactionId: Number(transactionId) }
      };

      if (typeof cc === 'string' && cc.trim()) {
        emailOptions.cc = cc.trim();
      }

      email.send(emailOptions);


      return {
        ok: true,
        attachedToTransactionId: Number(transactionId),
        ccSent: Boolean(emailOptions.cc),
        attachmentsCount: attachments.length
      };

    } catch (e) {
      // Esto te va a revelar el error real en la respuesta y en el Execution Log
      log.error('RESTlet failed', {
        name: e.name,
        message: e.message,
        stack: e.stack
      });

      // Re-throw “limpio” para que la API no te lo esconda tanto
      throw nsError.create({
        name: e.name || 'RESTLET_ERROR',
        message: `${e.message || e}`,
        notifyOff: true
      });
    }
  };

  return { post };
});
