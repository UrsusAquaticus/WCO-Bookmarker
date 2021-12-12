chrome.webNavigation.onCompleted.addListener(
	(details) => {
		if (details.frameId == 0) {
			if (!RegExp("inc/embed").test(details.url)) {
				Main(details.url);
			}
		}
	},
	{ url: [{ urlMatches: "https://www.wcostream.com/*" }] }
);

const Main = async (pageUrl) => {
	let folderId = "";
	promiseGetFolder("WCOSTREAM")
		.then((value) => (folderId = value))
		.then(() => {
			return promiseGetRegex(pageUrl);
		})
		.then((regexObj) => {
			//Clean up name
			let name = regexObj[1];
			let cleanName = "";
			return promiseCleanUp(name).then((value) => {
				cleanName = value;
				let bookmarkObj = {
					regexObj,
					name: cleanName,
					episode: null,
				};
				return bookmarkObj;
			});
		})
		.then((bookmarkObj) => {
			//Clean up episode
			let episode = bookmarkObj.regexObj[2];
			let cleanEpisode = "";
			return promiseCleanUp(episode).then((value) => {
				cleanEpisode = value;
				bookmarkObj.episode = cleanEpisode;
				return bookmarkObj;
			});
		})
		.then((bookmarkObj) => {
			//Remove existing matches
			return promiseRemoveExisting(folderId, bookmarkObj).then(() => {
				return bookmarkObj;
			});
		})
		.then((bookmarkObj) => {
			//Save as bookmark within folder
			return promiseAddBookmark(folderId, bookmarkObj, pageUrl);
		})
		.catch((error) => {
			console.log(error);
		});
};

const promiseGetFolder = (name) => {
	const getFolder = (resolve, reject) => {
		try {
			chrome.bookmarks.search(name, (results) => {
				if (results.length == 0) {
					//create new folder
					chrome.bookmarks.create(
						{ parentId: chrome.bookmarks.getTree.id, title: name },
						(newFolder) => {
							resolve(newFolder.id);
						}
					);
				} else {
					//Use folder
					resolve(results[0].id);
				}
			});
		} catch (error) {
			reject("Failed to get folder: " + error);
		}
	};
	return new Promise(getFolder);
};

const promiseGetRegex = (pageUrl) => {
	const getRegex = (resolve, reject) => {
		//Break up url into name and episode
		let regex = new RegExp(".com/(.*?)-(episode-.+)");
		let regexObj = regex.exec(pageUrl);
		if (regexObj == null) {
			reject("Couldn't Parse Url: " + pageUrl);
		} else {
			resolve(regexObj);
		}
	};
	return new Promise(getRegex);
};

const promiseCleanUp = (text) => {
	const cleanUp = (resolve, reject) => {
		if (text == "") reject("No text to clean up");
		try {
			const cleanText = text
				.replace(/-/g, " ")
				.replace(/(^\w{1})|(\s{1}\w{1})/g, (char) => {
					return char.toUpperCase();
				});
			resolve(cleanText);
		} catch (error) {
			reject("Clean up error: " + error);
		}
	};
	return new Promise(cleanUp);
};

const promiseRemoveExisting = (folderId, bookmarkObj) => {
	const removeExisting = (resolve, reject) => {
		try {
			chrome.bookmarks.search(bookmarkObj.name, (results) => {
				for (let i = 0; i < results.length; i++) {
					//skip if found bookmark is not in designated folder
					if (results[i].parentId != folderId) continue;
					chrome.bookmarks.remove(results[i].id);
					console.log("Removed " + results[i].title);
				}
				resolve(bookmarkObj);
			});
		} catch (error) {
			reject("Failed to remove bookmark: " + error);
		}
	};
	return new Promise(removeExisting);
};

const promiseAddBookmark = (folderId, bookmarkObj, pageUrl) => {
	const addBookmark = (resolve, reject) => {
		try {
			//Save as bookmark within folder
			chrome.bookmarks.create({
				index: 0,
				parentId: folderId,
				title: bookmarkObj.name + " - " + bookmarkObj.episode,
				url: pageUrl,
			});
			console.log("Saved " + bookmarkObj.name + " - " + bookmarkObj.episode);
			resolve(bookmarkObj);
		} catch (error) {
			reject("Failed to add bookmark: " + error);
		}
	};
	return new Promise(addBookmark);
};
