import fs from "fs"
import path from "path"

import OS from "opensubtitles-api"
import minimist from "minimist"
import ffprobe from "ffprobe-client"

const appName = "opensubtitles-uploader"
const siteName = "opensubtitles.org"

main().then(result => process.exit(result))

async function main() {

  const defaultLanguage = (process.env.LANG || process.env.LC_ALL || "en_US.UTF-8").slice(0, 2)

  // https://trac.opensubtitles.org/projects/opensubtitles
  // > API Deprecated. any API running on OpenSubtitles.org is deprecated
  // > and not possible to register new user agents anymore
  // workaround: use useragent of https://github.com/vankasteelj/opensubtitles-uploader
  const version = '2.7.0'
  const useragent = `OpenSubtitles-Uploader v${version}`

  const defaultConfig = `${process.env.HOME}/.config/${appName}/config.json`

  const minimistOptions = {
    bool: [
      "automatictranslation",
      "foreignpartsonly",
      "highdefinition",
      "hearingimpaired",
      "ssl",
    ],
    default: {
      config: defaultConfig,
      sublanguageid: defaultLanguage,
      useragent,
      ssl: true,
    }
  }

  let args = minimist(process.argv.slice(2), minimistOptions)

  //console.dir({ args })

  const usageLine = `usage: ${appName} [options] [video_file] subtitles_file`

  if (args.h || args.help) {
    console.log([
      usageLine,
      "",
      "options:",
      "  --imdbid=NUMBER              movie ID in IMDB.",
      `  --sublanguageid=STRING       language ID. (default: ${defaultLanguage})`,
      "  --moviereleasename=STRING    name of release. default is guessed from filename.",
      "  --movieaka=STRING            alternate title, for example in another language.",
      "  --automatictranslation=BOOL  subtitle was auto-translated.",
      "  --subauthorcomment=STRING    comment for subtitle.",
      "  --subtranslator=STRING       name of translator.",
      "  --foreignpartsonly=BOOL      only foreign-language parts are subtitled.",
      "  --hearingimpaired=BOOL       subtitle is for hearing-impaired viewers.",
      `  --config=STRING              config file. (default: ${defaultConfig})`,
      `  --username=STRING            username for ${siteName}.`,
      `  --password=STRING            password for ${siteName}. can be MD5-hashed.`,
      //`  --apikey=STRING              API key for ${siteName}.`,
      "  --yes                        actually upload the subtitle.",
      "",
      "options are based on",
      "https://github.com/vankasteelj/opensubtitles-api/blob/master/lib/upload.js",
      "",
      `create config:`,
      `mkdir -p ${path.dirname(args.config)}`,
      `echo '{ "username": "", "password": "" }' >${args.config}`,
    ].join("\n"))
    return 1
  }
  delete args.help

  if (args._.length == 1) {
    args.subpath = args._[0]
  }
  else if (args._.length == 2) {
    args.path = args._[0]
    args.subpath = args._[1]
  }
  delete args._

  if (fs.existsSync(args.config)) {
    const config = JSON.parse(fs.readFileSync(args.config, "utf8"))
    args = {
      ...config,
      ...args,
    }
  }
  delete args.config

  if (!args.subpath) {
    console.log([
      usageLine,
      "",
      `help: ${appName} --help`,
    ].join("\n"))
    return 1
  }

  if (!fs.existsSync(args.subpath)) {
    console.log(`error: no such file: ${args.subpath}`)
    return 1
  }

  if (args.path && !fs.existsSync(args.path)) {
    console.log(`error: no such file: ${args.path}`)
    return 1
  }

  // TODO new api will require apikey
  /*
  if (!args.apikey) {
    console.log("error: no apikey. get apikey from https://www.opensubtitles.com/en/consumers and add to options or config-file")
    return 1
  }
  */

  // password can be md5-hashed
  // require('crypto').createHash('md5').update(PASSWORD).digest('hex');
  if (!args.username || !args.password) {
    console.log(`error: no username or password`)
    return 1
  }

  const os = new OS(args)
  //delete args.apikey
  delete args.username
  delete args.password
  delete args.useragent
  delete args.ssl

  if (args.path) {
    // get metadata from video file
    if (!args.movietimems) {
      //console.log("getting video duration with ffprobe")
      try {
        const videoInfo = await ffprobe(args.path)
        //console.dir(videoInfo) // debug
        args.movietimems = (videoInfo.format.duration * 1000)|0
      }
      catch (error) {
        console.log(`ignoring ffprobe error:`, error.constructor.name, error.message)
      }
    }

    if (!args.moviereleasename) {
      args.moviereleasename = path.basename(args.path, path.extname(args.path))
    }
  }

  if (args.y || args.yes) {
    // upload can fail in future
    console.log('note: we plan to turn off OpenSubtitles.org API by the end of 2023. Please use new OpenSubtitles.com REST API instead.')
    let result
    try {
      result = await os.upload(args)
    }
    catch (error) {
      // fixme? "Our anti-spam trigger has been triggered."
      // maybe because the subtitle was uploaded already
      console.log(`upload error:`, error.message)
      return 1
    }
    console.log("upload result:")
    console.dir(result)
    return 0
  }
  else {
    console.log("preview of upload options:")
    console.dir(args)
    console.log("")
    console.log("add option '--yes' to upload subtitle")
    return 1
  }

}
