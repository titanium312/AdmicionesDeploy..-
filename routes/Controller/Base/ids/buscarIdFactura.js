const axios = require('axios');
const { instituciones } = require("../Instituciones");
async function buscarFactura(req, res) {
    
    try {
        const { sSearch, idFactura, idInstitucion } = req.body;

        if (!sSearch && !idFactura) {
            return res.status(400).json({ 
                error: "Debe enviar sSearch o idFactura en el body",
                ejemplo1: '{"sSearch": "241816", "idInstitucion":14}',
                ejemplo2: '{"idFactura": "4495607", "idInstitucion":20}'
            });
        }

        if (!idInstitucion) {
            return res.status(400).json({ 
                error: "Debe enviar idInstitucion en el body"
            });
        }

        // Buscar el token según el idInstitucion
        const institucion = instituciones.find(inst => inst.idInstitucion === idInstitucion);
        if (!institucion) {
            return res.status(400).json({ 
                error: `No existe institución con id ${idInstitucion}`
            });
        }

        const token = institucion.Tksesicion;

        const url = "https://balance.saludplus.co/facturasAdministar/BuscarListadofacturasDatos?fechaInicial=01/01/2020&fechaFinal=01/01/2029&idEntidad=0&idContrato=0&SinNumero=False&duplicadas=False&idCuentaCobro=0&estadoFacturacionElectronica=0";
        
        const postData = `sEcho=2&iColumns=8&sColumns=%2CCHECK%2CNUMERO%2CFECHA%2CRESOLUCION%2CPACIENTE%2CENTIDAD%2CESTADO&iDisplayStart=0&iDisplayLength=100&mDataProp_0=0&mDataProp_1=1&mDataProp_2=2&mDataProp_3=3&mDataProp_4=4&mDataProp_5=5&mDataProp_6=6&mDataProp_7=7&sSearch=${sSearch || ''}&bRegex=false&sSearch_0=&bRegex_0=false&bSearchable_0=true&sSearch_1=&bRegex_1=false&sSearchable_1=false&sSearch_2=&bRegex_2=false&sSearchable_2=false&sSearch_3=&bRegex_3=false&sSearchable_3=false&sSearch_4=&bRegex_4=false&sSearchable_4=false&sSearch_5=&bRegex_5=false&sSearchable_5=false&sSearch_6=&bRegex_6=false&sSearchable_6=false&sSearch_7=&bRegex_7=false&sSearchable_7=false&iSortingCols=1&iSortCol_0=0&sSortDir_0=asc&bSortable_0=true&bSortable_1=false&bSortable_2=false&bSortable_3=false&bSortable_4=false&bSortable_5=false&bSortable_6=false&bSortable_7=false`;

        const headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "data": token
        };

        const response = await axios.post(url, postData, { headers });

        if (!response.data.aaData || response.data.aaData.length === 0) {
            return res.json({ 
                error: sSearch ? `No existe factura con número ${sSearch}` : 'No se encontraron facturas'
            });
        }

        const facturas = response.data.aaData.map(f => ({
            id: f[0],
            numeroCompleto: f[2],
            numero: f[2] ? f[2].split(' - ')[0] : ''
        }));

        let resultado;

        if (sSearch) {
            resultado = facturas.find(f => f.numero === sSearch.toString()) || { error: `No se encontró factura con número ${sSearch}` };
        } else if (idFactura) {
            resultado = facturas.find(f => f.id === idFactura.toString()) || { error: `No se encontró factura con ID ${idFactura}` };
        }

        res.json(resultado);

    } catch (error) {
        res.status(500).json({ 
            error: "Error del servidor",
            mensaje: error.message 
        });
    }
}

module.exports = { buscarFactura };


