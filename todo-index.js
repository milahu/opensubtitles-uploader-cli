import OS from "opensubtitles.com"

throw new Error("wontfix: no upload method at https://github.com/vankasteelj/opensubtitles.com/blob/master/methods.json")

main()

function main() {

const apikey = process.env.OPENSUBTITLES_API_KEY

if (!apikey) {
console.log(`no apikey`)
console.log(`get apikey from https://www.opensubtitles.com/en/consumers`)
console.log(`pass apikey as environment variable OPENSUBTITLES_API_KEY`)
return
}

const os = new OS({apikey})

}
