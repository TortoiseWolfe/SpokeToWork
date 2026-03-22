import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { VisibilityControls } from './VisibilityControls';
import type { VisibilityControlsProps, ResumeVisibility } from './VisibilityControls';

const meta: Meta<typeof VisibilityControls> = {
  title: 'Molecular/VisibilityControls',
  component: VisibilityControls,
};

export default meta;

function Interactive(props: Partial<VisibilityControlsProps>) {
  const [profilePublic, setProfilePublic] = useState(
    props.profilePublic ?? true
  );
  const [resumeVisibleTo, setResumeVisibleTo] = useState<ResumeVisibility>(
    props.resumeVisibleTo ?? 'none'
  );

  return (
    <VisibilityControls
      profilePublic={profilePublic}
      resumeVisibleTo={resumeVisibleTo}
      disabled={props.disabled}
      onChange={(changes) => {
        if (changes.profile_public !== undefined) {
          setProfilePublic(changes.profile_public);
        }
        if (changes.resume_visible_to !== undefined) {
          setResumeVisibleTo(changes.resume_visible_to);
        }
      }}
    />
  );
}

export const AllPrivate: StoryObj = {
  render: () => <Interactive profilePublic={true} resumeVisibleTo="none" />,
};

export const AllOpen: StoryObj = {
  render: () => (
    <Interactive profilePublic={true} resumeVisibleTo="all_employers" />
  ),
};

export const AppliedOnly: StoryObj = {
  render: () => (
    <Interactive profilePublic={true} resumeVisibleTo="applied" />
  ),
};

export const ProfileHidden: StoryObj = {
  render: () => (
    <Interactive profilePublic={false} resumeVisibleTo="none" />
  ),
};

export const Disabled: StoryObj = {
  render: () => (
    <Interactive
      profilePublic={true}
      resumeVisibleTo="applied"
      disabled={true}
    />
  ),
};
