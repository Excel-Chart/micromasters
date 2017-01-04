# -*- coding: utf-8 -*-
# Generated by Django 1.10.3 on 2017-01-04 23:04
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ecommerce', '0010_coupon'),
    ]

    operations = [
        migrations.AddField(
            model_name='coupon',
            name='coupon_type',
            field=models.CharField(choices=[('standard', 'standard'), ('discounted-previous-course', 'discounted-previous-course')], help_text='The type of the coupon which describes what circumstances the coupon can be redeemed', max_length=30),
            preserve_default=False,
        ),
    ]
