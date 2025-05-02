//importem les dependencies lo primer de tot mpc xD
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { zod } from 'zod';

// 1.Crear el servidor
// Es la interfaz principal ccon el protocolo MCP. Maneja la comunicación entre el cliente y el servidor
//const server = new McpServer({ port: 3002 })

const server = new McpServer({
    name: 'Demo',
    version: '1.0.0', //aquestes dos són les minimes pero amb autoomplit o control space o documentacioo podem veure k podem pasar molt més
});

//eines és el més interesant tot i que mpc poden dur prompts, recursos i altres coses


// 2. Definir  esquema diu l'autocomplete pero midu tenim
// 2. Definir las herramientas, tools lo més tipic, de lectura, escritura, que tingui algun tipus d'estat, o que depengui d'algo extern, calcul, proccés, etc
//si fem server.tool avans d'escriure tool veiem que tenim (a part de connect, server i close), lo de prompt que poden fer-te preguntes, ser reutilitzables i resources (solo de lectura per si vols retornar la configuracio o algo en concret) i tools que es lo més tipic etc Hem de dir el nom i la descripció com a mínim
server.tool(
    'fetch-weather', //nom de la tool o titul de la tool
    'Tool to fetch the weather of a city', //descripció de la tool
//i ara quins parametres necessita l'objecte per funcionar o sigui que li pasarem un objecte que té una ciutat, etc  pero fixa't que no hem de fer res, la ia sabrà on esta la ciutat sense que fem res
	{
        citty: z.string().describe('City name'), //poddriem descriure o no. MÉS OPCIONAL PERÒ CONTRA MÉS CONTEXT, MÉS PODRA LAIA ENTENDRE K VOLEM QUE FACI
        //country: z.string().describe('Country name'),
    },
    async ({ city }) => {
        //finalment tenim el callback per recuperar la entrada del usuario i fer lo que volguem que faci. Lo més sencill seria retornar un objecte amb un array dins amb lo que fem amb la informació
        return {
            content: [
                {
                    type: 'text',
                    value: `El clima en ${city} es soleado` //DSP HO COMPLIQUEM
                }
            ]
        }
    }
);

//3. Escoltar les conexions a aquest servidor per part del client
const transport = new StdioServerTransport();
//ARA MATEIX EL TRANSPORT ES StdioServerTransport que es l'standard de entrada i sortida pq l'utilitzem en local i no a internet. que transporti pel nostre pc la nostra maquina
//i el servidor es  conectarà a aquest transport de datos
await server.connect(transport);

//per executar amb typescript al vol sense previa compilacio amb el nou node farem npx tsx -y main.ts i es quedara funcionant bé quedant-se com amb el cursor escoltant pero no cal que aixekem el server amb els mpc, sino que ja el cridara el client amb el npx del json
// node main.js i tsx main.ts pero podem fer npx tsx -y main.ts i es quedara funcionant bé quedant-se com amb el cursor escoltant i no se li aturara a la ia fent preguntes gracies al -y