//importem les dependencies lo primer de tot mpc xD
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from 'zod';

// 1.Crear el servidor
// Es la interfaz principal ccon el protocolo MCP. Maneja la comunicación entre el cliente y el servidor
//const server = new McpServer({ port: 3002 })

const server = new McpServer({
    name: 'weather',
    version: '1.0.0', //aquestes dos són les minimes pero amb autoomplit o control space o documentacioo podem veure k podem pasar molt més
});
//em fixo que tenim name del server i nom de la tool sense name: al davant
//eines és el més interesant tot i que mpc poden dur prompts, recursos i altres coses


// 2. Definir  esquema diu l'autocomplete pero midu tenim
// 2. Definir las herramientas, tools lo més tipic, de lectura, escritura, que tingui algun tipus d'estat, o que depengui d'algo extern, calcul, proccés, etc
//si fem server.tool avans d'escriure tool veiem que tenim (a part de connect, server i close), lo de prompt que poden fer-te preguntes, ser reutilitzables i resources (solo de lectura per si vols retornar la configuracio o algo en concret) i tools que es lo més tipic etc Hem de dir el nom i la descripció com a mínim
server.tool(
    'fetch-weather', //nom de la tool o titul de la tool
    'Tool to fetch the weather of a city', //descripció de la tool
//i ara quins parametres necessita l'objecte per funcionar o sigui que li pasarem un objecte que té una ciutat, etc  pero fixa't que no hem de fer res, la ia sabrà on esta la ciutat sense que fem res
	{
        city: z.string().describe('City name'), //poddriem descriure o no. MÉS OPCIONAL PERÒ CONTRA MÉS CONTEXT, MÉS PODRA LAIA ENTENDRE K VOLEM QUE FACI
        //country: z.string().describe('Country name'),
    },
    async ({ city }) => {
        //finalment tenim el callback per recuperar la entrada del usuario i fer lo que volguem que faci. Lo més sencill seria retornar un objecte amb un array dins amb lo que fem amb la informació
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=10&language=en&format=json`);
        const data = await response.json();
        // ens dona un data que es un array amb un objecte amb latitud i longitud
        if (data.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        value: `No s'ha trobat informació de la ciutat ${city}`, //important informar a la IA que no s'ha trobat la ciutat
                    }//value? crec que es text com hem dit adalt xD deu ser lautocomplit
                ]
            }
        }
        const { latitude, longitude } = data[0].results[0] //el treiem del primer objecte si tenim data agafem longitude i latitude i agafem el clima dels dies
        //i ara podem fer la peticio a la api de temps
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m&current_temperature_2m,precipitation,is_day,rain&forecast_days=1`)
        const weatherData = await weatherResponse.json() //podriem retornar la informacio json en format text tractat pero no cal la ia es llesta o sigui que li tornarem el json sense
        // ens dona un data que es un array amb un objecte amb latitud i longitud
/*        if (weatherData.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        value: `No s'ha trobat informació de la ciutat ${city}`, //important informar a la IA que no s'ha trobat la ciutat
                    } crec que estaria bé per si no va bé la segona trucada d'api pero wenu midu no ho ha posat i deixaré el codi com ell po aixo comentat pk segur que s'ha deixat de validar vamos, ta clar prou ocupat esta amb akesta clase que es una obra maestra digne d'haberla repetit i em venen ganes de rerepetirla jaja */
        //i ara podem treure el forcast pasant latitud i longitud a la ui de meteo li pots dir dies, el current weather precipitation si es dia o nit si plou el vent si pots fer surf etc... i ens dons una url amb la info que hem triat a la UI. po nosaltres no tractem els datos per dir fa fred o calor, ja ho dira la ia
        return {
            content: [
                {
                    type: 'text',
                    // nono, que la ia entengui lo que li tornem i punto. jaja value: `El clima en ${city} es ${weatherDescription}`, //DSP HO COMPLIQUEM
                    text: JSON.stringify(weatherData, null, 2) // el null i 2 no recordo que eren i ara no ho diu pero amb els parametres k pasem la ia ja entendrà
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


//antic apunt per executar amb typescript al vol sense compilacio amb el nou node farem npx tsx -y main.ts i es quedara funcionant bé quedant-se com amb el cursor escoltant pero no cal que aixekem el server amb els mpc, sino que ja el cridara el client amb el npx del json
