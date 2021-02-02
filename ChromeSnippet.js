// parse Album Infos from Apple Musik

var title = $('#page-container__first-linked-element').innerText;
var artist = $('#web-main > div.loading-inner > div > div.product-info > div.header-and-songs-list > div.product-page-header > div.album-header-metadata > h2 > a').innerText;
var imageUrlList = $('.media-artwork-v2 > picture > source:nth-child(1)').srcset.split(' ');

var cover = imageUrlList[imageUrlList.length - 2]

var pathnameList = location.pathname.split('/');
var id = pathnameList[pathnameList.length - 1];

var url = location.href;

console.log({ type: 'applemusic', title, artist, cover, id, url, uuid: '' })
