const axios = require('axios');

const AdmisionBuscarConAscendientes = async (req, res) => {
    const { idAdmision } = req.query;

    if (!idAdmision) {
        return res.status(400).json({ message: "El parámetro idAdmision es requerido" });
    }

    try {
        const response = await axios({
            method: 'get',
            url: `https://balance.saludplus.co/admisiones/AdmisionBuscarConAscendientes`,
            params: { idAdmision },
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6IkpFUk9OSU1PUlRFR0EiLCJqdGkiOiJmZTJmYmQ0Ny0wZjA4LTRhNTgtOWI0MC00OTgwMzkwOGU1NTAiLCJ1c2VybmFtZSI6IkpFUk9OSU1PUlRFR0EiLCJlbWFpbCI6Im5lZGVyLmplcm9AZ21haWwuY29tIiwiYWRtaW4iOiJZIiwidXNlcmlkIjoiNjg1MyIsInBlcm1pc3Npb25zIjoiW10iLCJpbnN0aXR1dGlvbiI6IjIwIiwicGFnb3MiOiIwIiwidmVyc2lvbiI6IjEuMC4wLjAiLCJlbnZpcm9ubWVudCI6IlByb2R1Y3Rpb24iLCJleHAiOjE3Nzk5NjkyMzksImlzcyI6InRlZ2V0dC5sb2dpbiIsImF1ZCI6InRlZ2V0dC5jb20ifQ.Br6YdyErXwnNQqOgbDY0PVc9GHjYVuNX086sKIEnrHM',
                'Cookie': '_clck=nhljy0%5E2%5Eg5u%5E0%5E2318; _ga=GA1.1.561858909.1778169230; _ga_581YHK4S33=GS2.1.s1778181249$o2$g1$t1778181697$j57$l0$h0; _clsk=1p1j7fm%5E1778181697474%5E11%5E1%5Eb.clarity.ms%2Fcollect',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest',
                'data': 'sTr4cxGZjL0fUkrqAGmS3fyRjw0LTyWCX+wei5FAh40=.pNjdaOZN9Uyrfj1i7WTJiA==.wcFkBNOeMUO3EbN8I4nUXw=='
            }
        });

        // Al enviar response.data, entregas el JSON original completo de SaludPlus
        res.status(200).json(response.data);

    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(error.response?.status || 500).json({
            error: "Error al conectar con SaludPlus",
            message: error.message
        });
    }
};

module.exports = { AdmisionBuscarConAscendientes };

// curl "http://localhost:3000/AdmisionBuscarConAscendientes?idAdmision=6466386"