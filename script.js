var map;
var myLatLng = { lat: 14.697580, lng: 121.089948};
var myZoom = 18;
var removeMode = false;
// dapat itong mga variable na ito ay kunin from some storage

var patientLocations = [
    {id: 1, lat: 14.697017, lng: 121.088796},
    {id: 2, lat: 14.697387, lng: 121.088833},
    {id: 3, lat: 14.697466, lng: 121.089262},
    {id: 4, lat: 14.696853, lng: 121.089793},
    {id: 5, lat: 14.697095, lng: 121.088123},
    {id: 6, lat: 14.69758, lng: 121.089948},
    {id: 7, lat: 14.696770995311615, lng: 121.0894509851164},
    {id: 8, lat: 14.696453261995734, lng: 121.0892525843236},
    {id: 9, lat: 14.696811993882754, lng: 121.08935561739372},
    {id: 10, lat: 14.695496, lng: 121.089083}
];

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: myLatLng,
        zoom: myZoom
    });

    const hullLocations = convexHull(patientLocations);
    drawHull(hullLocations);

    var i;
    for(i = 0; i < patientLocations.length; i++){
        const marker = new google.maps.Marker({
            position: patientLocations[i],
            draggable: true,
            map,
        });
        addMarkerEvents(marker, patientLocations[i].id);
    }
    console.log(patientLocations);
}
function addMarkerEvents(marker, id){
    //remove the marker if it was clicked and rmeove mode is on
    marker.addListener("click", () => {
        if(removeMode){
            const position = patientLocations.findIndex(x => x.id == id);
            patientLocations.splice(position, 1);
            marker.setMap(null);
            const newHull = convexHull(patientLocations);
            polygon.setPath(newHull);
        }
    });

    //This event will trigger once user drags a marker
    //1. get index of the marker in the array by using the id
    //2. replace that lat and lng values in the specified position in the array
    //3. get hull points of the updated array that we just changed
    //4. set the existing polygon path to the new hull points we just created 
    google.maps.event.addListener(marker, 'dragend', function() {
        const position = patientLocations.findIndex(x => x.id == id);
        patientLocations[position].lat = marker.getPosition().lat();
        patientLocations[position].lng = marker.getPosition().lng(); 
        const newHull = convexHull(patientLocations);
        polygon.setPath(newHull);
    });
}

function drawHull(points) {
    window.polygon = new google.maps.Polygon({
        paths: points,
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.35,
    });
    const area = google.maps.geometry.spherical.computeArea(polygon.getPath()); // pang compute ng area ng hull
    console.log(area);
    polygon.setMap(map);
}

//this calculates the determinant vectors from the given points
//a positive result means that point c lies to the left of the line created by point a and b
//use logical operator > and compare it to zero to return a boolean
function isLeft(a, b, c){
    return result = ((b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng)) > 0;
}

function convexHull(coordinates){
    const points = coordinates;
    points.sort((a,b) => a.lng - b.lng);    //get the left most point by sorting the given coordinates
    var start = points[0];                  //the first coordinate after sorting is the left most which is definitely a part of the hull
    var result = [];                        //result[] will store the convex hull points
    var i = 0;

    do {
        result[i] = start;                  //store the leftmost point in the result[], also, this is the current point that we are checking
        var current = result[0];            //intially, we set current to leftmost point, this will change later
        var j;
        for(j = 0; j < points.length; j++){                             //loop through all the patient location points
            var checkLeft = isLeft(result[i], current, points[j]);      //check the location point if it is to the left of the line
            if((current == start) || checkLeft){                        //nasa wikipedia tong algorithm na to hahahaha
                current = points[j];
            }
        }
        start = current;
        i++;
    } while (current != result[0])
    return result;
}

function setArea(){
    myLatLng = map.getCenter(); 
    myZoom = map.getZoom();
    alert("area succesfully changed");

    //add code to save  mylatlng to a storage
    //para pag niload ni user ang map ay maipapakita ang nakasave na location imbes na kung saan lang
}

function goToArea(){
    map.panTo(myLatLng);
    map.setZoom(myZoom);
}

function addMarker(){

}

function removeMarker(){
    if(removeMode){
        removeMode = false;
        document.getElementById("message").innerHTML = "";
        return;
    }
    removeMode = true;
    document.getElementById("message").innerHTML = "You are in Remove Mode. Click 'remove' again to exit";
}