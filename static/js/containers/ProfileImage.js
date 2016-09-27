// @flow
/* global SETTINGS: false */
import React from 'react';
import { connect } from 'react-redux';
import Icon from 'react-mdl/lib/Icon';
import moment from 'moment';
import type { Dispatch } from 'redux';

import { makeProfileImageUrl, getPreferredName } from '../util/util';
import type { Profile } from '../flow/profileTypes';
import ProfileImageUploader from '../components/ProfileImageUploader';
import { createActionHelper } from '../util/redux';
import { setPhotoDialogVisibility } from '../actions/ui';
import {
  startPhotoEdit,
  clearPhotoEdit,
  updatePhotoEdit,
  updateUserPhoto,
} from '../actions/image_upload';
import { fetchUserProfile } from '../actions/profile';

const formatPhotoName = photo => (
  `${photo.name.replace(/\.\w*$/, '')}-${moment().format()}.png`
);

class ProfileImage extends React.Component {
  props: {
    profile:              Profile,
    editable:             boolean,
    imageUpload:          Object,
    dispatch:             Dispatch,
    clearPhotoEdit:       () => void,
    setDialogVisibility:  (b: boolean) => void,
    updatePhotoEdit:      (b: Blob) => void,
    startPhotoEdit:       (p: File) => void,
    photoDialogOpen:      boolean,
  };

  static defaultProps = {
    editable: false
  };

  updateUserPhoto: Function = () => {
    const {
      profile: { username },
      imageUpload: { edit, photo },
      dispatch,
      clearPhotoEdit,
      setDialogVisibility,
    } = this.props;
    return dispatch(updateUserPhoto(username, edit, formatPhotoName(photo))).then(() => {
      clearPhotoEdit();
      setDialogVisibility(false);
      this.fetchUserProfile();
    });
  };

  fetchUserProfile: Function = () => {
    const { dispatch } = this.props;
    dispatch(fetchUserProfile(SETTINGS.username));
  };

  cameraIcon: Function = (editable: bool): React$Element<*>|null => {
    const { setDialogVisibility } = this.props;
    if ( editable ) {
      return <span className="img">
        <Icon name="camera_alt" onClick={() => setDialogVisibility(true)} />
        </span>;
    } else {
      return null;
    }
  }

  render () {
    const { profile, editable } = this.props;
    const imageUrl = makeProfileImageUrl(profile);

    return (
      <div className="avatar">
        <ProfileImageUploader
          {...this.props}
          updateUserPhoto={this.updateUserPhoto}
        />
        <img
          src={imageUrl}
          alt={`Profile image for ${getPreferredName(profile, false)}`}
          className="card-image"
        />
        { this.cameraIcon(editable) }
      </div>
    );
  }
}

const mapStateToProps = state => ({
  photoDialogOpen: state.ui.photoDialogVisibility,
  imageUpload: state.imageUpload,
});

const mapDispatchToProps = dispatch => ({
  setDialogVisibility: createActionHelper(dispatch, setPhotoDialogVisibility),
  startPhotoEdit: createActionHelper(dispatch, startPhotoEdit),
  clearPhotoEdit: createActionHelper(dispatch, clearPhotoEdit),
  updatePhotoEdit: createActionHelper(dispatch, updatePhotoEdit),
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(ProfileImage);