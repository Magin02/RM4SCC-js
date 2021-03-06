function findCodeBar(image) {
    let grayImage = new cv.Mat();
    let gradX = new cv.Mat();
    let gradY = new cv.Mat();

    cv.cvtColor(image, grayImage, cv.COLOR_BGR2GRAY);

    cv.Sobel(grayImage, gradX, cv.CV_8U, 1, 0, -1);
    cv.Sobel(grayImage, gradY, cv.CV_8U, 0, 1, -1);

    cv.subtract(gradX, gradY, grayImage);
    cv.convertScaleAbs(grayImage, grayImage);


    cv.blur(grayImage, grayImage, new cv.Size(9, 9), new cv.Point(-1, -1), cv.BORDER_DEFAULT);
    cv.threshold(grayImage, grayImage, 40, 255, cv.THRESH_BINARY);

    let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(21, 7));
    cv.morphologyEx(grayImage, grayImage, cv.MORPH_CLOSE, kernel);

    cv.erode(grayImage, grayImage, kernel, new cv.Point(-1, -1), 1);
    cv.dilate(grayImage, grayImage, kernel, new cv.Point(-1, -1), 1);

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(grayImage, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    let areas = [];
    for (let i = 0; i < contours.size(); i++){
        let feature = cv.boundingRect(contours.get(i));
        areas.push({area: feature.width * feature.height, index: i});
    }

    let index = _.maxBy(areas, 'area').index;

    let rect = cv.boundingRect(contours.get(index));
    let rotatedRect = cv.minAreaRect(contours.get(index));

    let angle = rotatedRect.angle;
    let rect_size = rotatedRect.size;

    if (rotatedRect.angle < -45) {
        angle += 90.0;
        [rect_size.width, rect_size.height] = [rect_size.height, rect_size.width];
    }
    let M = cv.getRotationMatrix2D(rotatedRect.center, angle, 1.0);

    cv.warpAffine(image, image, M, image.size(), cv.INTER_CUBIC);
    // crop the resulting image

    rect = expandRectangle(rect, image.size());

    image = image.roi(rect);

    grayImage.delete();
    hierarchy.delete();
    gradX.delete();
    gradY.delete();
    return image;
}

function prepareImage(image){
    let size = image.size();
    let heightPercent = size.height / 100;
    let rect = new cv.Rect(0, heightPercent * 20, size.width, heightPercent * 70);
    image = image.roi(rect);
    cv.cvtColor(image, image, cv.COLOR_BGR2GRAY);

    cv.threshold(image,image,0,255,cv.THRESH_BINARY_INV+cv.THRESH_OTSU);

    cv.medianBlur(image, image, 3);


    return image;
}


function findContours(image){
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(image, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    return contours;
}


function expandRectangle(rect, imageSize, percentage = 10){
    let width = (rect.width / 100) * percentage;


    if (rect.x - (width / 2) < 0){
        return expandRectangle(rect, imageSize, --percentage);
    }
    rect.width += width;

    rect.x -= (width / 2);

    return rect;
}