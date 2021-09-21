var Airtable = require('airtable');
const fs = require('fs');
var base = new Airtable({apiKey: 'keyH6GGqJvFz12MrC'}).base('appEBGI8KBX1LFwSa');

const username = process.argv[2];
console.log(username)

async function getPosts() {
  try {
    const records = await base('Posts').select({
      fields: ["shortcode", "company"],
      filterByFormula: "{company} = '" + username + "'"
    }).all();
    let result = [];
    for (let i = 0; i < records.length; i++) {
      result.push(records[i].get('shortcode'))
    }
    return result
  } catch(err) {
    console.log(err)
  }
}
getPosts().then((posts) => {
  console.log(posts)

  // import all companies that are not yet included
  let companyFolder = "./example_data/" + username + "/";
  // import all posts that are not yet included
  fs.readdirSync(companyFolder).forEach(file => {
    if(file != "companydata.json" && file.endsWith('.json')) {
      let rawpostjson = fs.readFileSync(companyFolder + file);
      let postjson = JSON.parse(rawpostjson);
      if (!postjson.graphql) {
          console.log("delete json")
          fs.unlinkSync("./../data/" + username + "/" + file)
      }
      if (postjson.graphql && !posts.includes(postjson.graphql.shortcode_media.shortcode)) {

        // format data
        let post = postjson.graphql.shortcode_media;

        // format post description
        let post_description = post.edge_media_to_caption.edges[0];
        post_description = (typeof post_description === 'undefined') ? '' : post_description.node.text;

        // format location
        let location = post.location;
        location = (location == null) ? '' : location.name;

        // format comments
        let postComments = post.edge_media_to_parent_comment.edges;

        // get array of images
        let images = [
          {
            "url": post.display_url
          }
        ];
        if (post.edge_sidecar_to_children) {
          let carousel = post.edge_sidecar_to_children.edges;
          for (let i = 1; i < carousel.length; i++) {
            images.push({
              "url": carousel[i].node.display_url
            });
          }
        }

        // create post
        base('Posts').create({
          "shortcode": post.shortcode,
          "images": images,
          "company": username,
          "post_id": post.id,
          "date": new Date(post.taken_at_timestamp * 1000).toISOString(),
          "post_description": post_description,
          "accessibility_caption": post.accessibility_caption,
          "count_likes": post.edge_media_preview_like.count,
          "count_comments": post.edge_media_to_parent_comment.count,
          "location": location,
          "comments_disabled": post.comments_disabled,
          "is_ad": post.is_ad,
          "is_video": post.is_video
        },
        {
            typecast: true
        },
        function(err, record) {
          if (err) {
            console.error(err);
            return;
          }
          console.log(record.getId());
        });
    }
  }
  });
})
