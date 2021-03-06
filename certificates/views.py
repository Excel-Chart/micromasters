"""
Views for MicroMasters-generated certificates
"""

import json
import logging
from django.conf import settings
from django.views.generic import TemplateView
from rest_framework.generics import Http404

from cms.models import CourseCertificateSignatories
from grades.models import MicromastersCourseCertificate

log = logging.getLogger(__name__)


class CourseCertificateView(TemplateView):  # pylint: disable=unused-argument
    """
    Views for course certificates
    """
    template_name = 'course_certificate.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        js_settings = {
            "gaTrackingID": settings.GA_TRACKING_ID,
            "reactGaDebug": settings.REACT_GA_DEBUG,
            "edx_base_url": settings.EDXORG_BASE_URL,
        }
        context["js_settings_json"] = json.dumps(js_settings)

        certificate = (
            MicromastersCourseCertificate.objects.filter(hash=kwargs.get('certificate_hash')).
            select_related('final_grade__course_run__course__program', 'final_grade__user__profile').
            first()
        )
        if not certificate:
            raise Http404

        course = certificate.final_grade.course_run.course
        signatories = CourseCertificateSignatories.objects.filter(course=course).all()
        if len(signatories) == 0:
            log.error(
                'Course "%s" (id: %s) does not have any signatories set in the CMS.', course.title, course.id
            )
            raise Http404

        context['course_title'] = course.title
        context['program_title'] = course.program.title
        context['name'] = certificate.final_grade.user.profile.full_name
        context['signatories'] = list(signatories)
        context['certificate'] = certificate

        return context
