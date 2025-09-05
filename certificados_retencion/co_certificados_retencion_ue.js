/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @ScriptName CO UE | Certificados Retención 
 * @NModuleScope Public
 * @Company Netsoft
 * @Author Fernando Valencia Rosas
 * Description: Se encarga de llamar a ejecutar del MapReduce que generará los PDFs
 * ScriptFile co_certificados_retencion_ue.js
 * ScriptId customscript_co_certificado_reten_ue
 * ScriptDeployment customdeploy_co_certificado_reten_ue
 */

define(['N/task', 'N/runtime', 'N/redirect'], function (task, runtime, redirect) {

    /**
     * Función que se encarga del llamado a ejecutar del MapReduce que generará los PDFs
     * @param context
     */
    function beforeLoad(context) {
        try {
            if (context.type === 'create' || context.type === 'copy') {
                redirect.toSuitelet({
                    scriptId: 'customscript_co_certificado_reten_ss',
                    deploymentId: 'customdeploy_co_certificado_reten_ss',
                });
            } else if (context.type === 'view') {
                context.form.removeButton('edit');
            }
        } catch (e) {
            log.error('beforeLoad', JSON.stringify(e));
        }
    }

    function afterSubmit(context) {
        try {
            log.debug('runtime.executionContext', runtime.executionContext)
            var newRecord = context.newRecord;
            //if (runtime.executionContext === runtime.ContextType.SUITELET || runtime.executionContext === runtime.ContextType.USER_INTERFACE) {
            if (runtime.executionContext === runtime.ContextType.SUITELET) {
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_co_certificado_reten_mr',
                    deploymentId: 'customdeploy_co_certificado_reten_mr',
                    params: { 'custscript_co_id_registro_cert_reten': newRecord.id }
                });
                log.debug('IDREGISTRO', newRecord.id);
                mrTask.submit();
            }
        } catch( e ){
            log.error('afterSubmit', JSON.stringify(e));
        } 
    }

    return {
        beforeLoad: beforeLoad,
        afterSubmit: afterSubmit
    };
});